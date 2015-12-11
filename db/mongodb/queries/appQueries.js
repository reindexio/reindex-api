import createSchema from '../../../graphQL/createSchema';
import toReindexSchema from '../../../graphQL/toReindexSchema';
import DefaultUserType from '../../../graphQL/builtins/DefaultUserType';
import { constructMissingIndexes } from './indexes';

export async function createStorageForApp(db) {
  await createBuiltInIndexesForApp(db);
}

export async function createBuiltInIndexesForApp(db) {
  const schema = createSchema([DefaultUserType]);
  const types = toReindexSchema(schema);
  await constructMissingIndexes(db, types, {});
}

export async function deleteStorageForApp(db) {
  await db.dropDatabase();
}
