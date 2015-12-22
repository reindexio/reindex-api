import { chain, remove, groupBy, sortBy, map } from 'lodash';
import { ObjectId } from 'mongodb';

import {
  constructMissingIndexes,
  deleteTypeIndexes,
} from './indexes';

export async function performMigration(db, commands, types, { indexes }) {
  const commandsByType = groupBy(commands, (command) => command.commandType);

  if (commandsByType.DeleteType) {
    await deleteTypes(db, commandsByType.DeleteType);
  }
  if (commandsByType.DeleteTypeData) {
    await deleteTypesData(db, commandsByType.DeleteTypeData, indexes);
  }
  if (commandsByType.DeleteFieldData) {
    await deleteFieldsData(db, commandsByType.DeleteFieldData, indexes);
  }
  if (commandsByType.CreateTypeData) {
    await createNewTypeData(db, commandsByType.CreateTypeData);
  }
  await updateTypes(db, commands);
  await constructMissingIndexes(db, types, indexes);
}

function deleteTypes(db, commands) {
  const typeIds = commands.map((command) => ObjectId(command.type.id.value));
  return db
    .collection('ReindexType')
    .deleteMany({
      _id: { $in: typeIds },
    });
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

function updateTypes(db, commands) {
  const commandsByTypeName = chain(commands)
    .filter((command) => (
      [
        'CreateType',
        'CreateField',
        'UpdateTypeInfo',
        'DeleteField',
        'UpdateFieldInfo',
      ].includes(
        command.commandType
      ))
    )
    .groupBy((command) => command.type.name)
    .value();

  const updatedTypes = map(commandsByTypeName, createUpdatedType);

  if (updatedTypes.length) {
    const batch = db.collection('ReindexType').initializeUnorderedBulkOp();
    for (const type of updatedTypes) {
      if (type.id) {
        batch.find({ _id: ObjectId(type.id.value) }).replaceOne(type);
      } else {
        batch.insert(type);
      }
    }
    return batch.execute();
  } else {
    return Promise.resolve(true);
  }
}

function createUpdatedType(commands) {
  let type;
  let fields = [];
  const commandsByType = groupBy(commands, (command) => command.commandType);
  if (commandsByType.CreateType) {
    type = commandsByType.CreateType[0].getData();
  } else {
    type = {
      ...commands[0].type,
    };
    fields = type.fields.filter((field) => !field.builtin);
  }

  if (commandsByType.UpdateTypeInfo) {
    type = {
      ...type,
      ...commandsByType.UpdateTypeInfo[0].getData(),
    };
  }

  for (const command of commandsByType.DeleteField || []) {
    remove(fields, (field) => field.name === command.fieldName);
  }

  for (const command of commandsByType.UpdateFieldInfo || []) {
    fields = fields.map((field) => {
      if (field.name === command.fieldName) {
        return {
          name: field.name,
          type: field.type,
          ...command.getData(),
        };
      } else {
        return field;
      }
    });
  }

  for (const command of commandsByType.CreateField || []) {
    fields.push(command.getData());
  }

  fields = sortBy(fields, (field) => field.name);

  return {
    ...type,
    fields,
  };
}
