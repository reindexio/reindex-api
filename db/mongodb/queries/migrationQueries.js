import { chain, groupBy, map } from 'lodash';

import {
  constructMissingIndexes,
  deleteTypeIndexes,
} from './indexes';

export async function performMigration(db, commands, types, { indexes }) {
  const commandsByType = groupBy(commands, (command) => command.commandType);

  if (commandsByType.DeleteTypeData) {
    await deleteTypesData(db, commandsByType.DeleteTypeData, indexes);
  }
  if (commandsByType.DeleteFieldData) {
    await deleteFieldsData(db, commandsByType.DeleteFieldData, indexes);
  }
  if (commandsByType.CreateTypeData) {
    await createNewTypeData(db, commandsByType.CreateTypeData);
  }

  await updateTypes(db, commandsByType.DeleteType || [], types);
  await constructMissingIndexes(db, types, indexes);
}

async function deleteTypesData(db, commands, indexes) {
  const names = commands.map((command) => command.type.name);
  await* names.map(async (name) => {
    await deleteTypeIndexes(db, name, indexes);
    await db.dropCollection(name);
  });
}

async function deleteFieldsData(db, commands, indexes) {
  const fieldsByType = groupBy(commands, (command) => command.type.name);
  const typeData = map(fieldsByType, (fields, typeName) => ({
    type: typeName,
    fields: fields.map((field) => field.path),
    update: {
      $unset: chain(fields)
        .map((field) => field.path.join('.'))
        .indexBy()
        .mapValues(() => true)
        .value(),
    },
  }));

  return await* typeData.map(async ({ type, fields, update }) => {
    await deleteTypeIndexes(db, type, indexes, fields);
    await db.collection(type).updateMany({}, update);
  });
}

function createNewTypeData() {
  // NOOP for Mongo, collections are created implicitely
  return Promise.resolve(true);
}

function updateTypes(db, deleteCommands, types) {
  const batch = db.collection('ReindexType').initializeUnorderedBulkOp();

  for (const command of deleteCommands) {
    batch.find({ name: command.type.name }).removeOne();
  }

  for (const type of types) {
    batch.find({ name: type.name }).upsert().replaceOne(type);
  }

  return batch.execute();
}
