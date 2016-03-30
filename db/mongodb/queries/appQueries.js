import createSchema from '../../../graphQL/createSchema';
import toReindexSchema from '../../../graphQL/toReindexSchema';
import injectDefaultFields from '../../../graphQL/builtins/injectDefaultFields';
import DefaultUserType from '../../../graphQL/builtins/DefaultUserType';
import { addID } from './queryUtils';
import { constructMissingIndexes } from './indexes';

export async function createDatabaseForApp(db) {
  await createBuiltInIndexesForApp(db);
}

export async function createBuiltInIndexesForApp(db) {
  const userType = {
    ...DefaultUserType,
    fields: injectDefaultFields(DefaultUserType),
  };
  const schema = createSchema([userType]);
  const types = toReindexSchema(schema);
  await constructMissingIndexes(db, types, {});
}

export async function deleteDatabaseForApp(db) {
  await db.dropDatabase();
}

export async function allocateStorage(db, type) {
  const storage = await db.collection('Storage').findOneAndUpdate(
    { databasesAvailable: { $gt: 0 }, 'settings.type': type },
    { $inc: { databasesAvailable: -1 } },
    { sort: { databasesAvailable: -1 }, returnNewDocument: true },
  );
  if (!storage.value) {
    throw new Error('Allocating database storage failed. ' +
      `No databases of type ${type} available.`
    );
  }
  return addID('Storage', storage.value);
}
