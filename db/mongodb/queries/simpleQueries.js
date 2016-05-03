import { transform, isArray } from 'lodash';
import { ObjectId } from 'mongodb';

import { UserError } from '../../../graphQL/UserError';
import injectDefaultFields from '../../../graphQL/builtins/injectDefaultFields';
import { addID, addTransform, isValidID } from './queryUtils';

export function getAllQuery(db, type) {
  const cursor = db.collection(type).find();
  return addTransform(cursor, (object) => addID(type, object));
}

export async function getSecrets(db) {
  const secrets = await getAllQuery(db, 'ReindexSecret').toArray();
  return addTransform(secrets, (secret) => secret.value);
}

export async function getTypes(db) {
  const types = await getAllQuery(db, 'ReindexType').toArray();
  return addTransform(types, (type) => {
    type.fields = injectDefaultFields(type);
    return type;
  });
}

export function getIndexes(db) {
  return getAllQuery(db, 'ReindexIndex').toArray();
}

export async function getMetadata(db) {
  const metadata = await Promise.all([
    getTypes(db),
    getIndexes(db),
    getAllQuery(db, 'ReindexHook').toArray(),
  ]);
  return {
    types: metadata[0],
    indexes: metadata[1],
    hooks: metadata[2],
  };
}

export async function getByID(db, type, id) {
  if (!isValidID(type, id)) {
    throw new UserError(`Invalid ID for type ${type}`);
  }
  const result = await db.collection(type).findOne({ _id: ObjectId(id.value) });
  return addID(type, result);
}

export async function getByIDBatch(db, type, ids) {
  const cursor = addTransform(db.collection(type).find({
    _id: {
      $in: ids.map((id) => ObjectId(id)),
    },
  }), (object) => addID(type, object));
  const result = await cursor.toArray();
  return ids.map((id) => (
    result.find((item) => item.id.value === id.toString())
  ));
}

export function getByFieldCursor(db, type, field, value) {
  let actualField = field;
  let actualValue = value;

  if (isArray(field)) {
    actualField = field.join('.');
  }

  if (actualField === 'id') {
    actualField = '_id';
    actualValue = ObjectId(value.value);
  }

  return db.collection(type).find({
    [actualField]: actualValue,
  }).limit(-1).batchSize(1);
}

export async function getByField(db, type, field, value) {
  const cursor = getByFieldCursor(db, type, field, value);
  return addID(type, await cursor.next());
}

function getAllByFilterQuery(db, type, filter) {
  const cleanFilter = transform(filter, (result, value, key) => {
    if (key === 'id') {
      result._id = new ObjectId(value.value);
    } else {
      result[key] = value;
    }
  });
  return db.collection(type).find(cleanFilter);
}

export function getAllByFilter(db, type, filter) {
  return addID(type, getAllByFilterQuery(db, type, filter)).toArray();
}

export async function hasByFilter(db, type, filter) {
  const result = await getAllByFilterQuery(db, type, filter)
    .limit(-1)
    .batchSize(1)
    .count();
  return result > 0;
}

export function getCount(db, cursor) {
  return cursor.count();
}

export function getEdges(db, query) {
  return query.getEdges();
}

export function getNodes(db, query) {
  return query.getNodes();
}

export function getPageInfo(db, promise) {
  return promise;
}
