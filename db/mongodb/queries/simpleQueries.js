import { ObjectId } from 'mongodb';

import injectDefaultFields from '../../../graphQL/builtins/injectDefaultFields';
import { addID, addTransform } from './queryUtils';

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
  const metadata = await* [
    getTypes(db),
    getIndexes(db),
    getAllQuery(db, 'ReindexPermission').toArray(),
    getAllQuery(db, 'ReindexHook').toArray(),
  ];
  return {
    types: metadata[0],
    indexes: metadata[1],
    permissions: metadata[2],
    hooks: metadata[3],
  };
}

export async function getByID(db, id) {
  const result = await db.collection(id.type).findOne({
    _id: ObjectId(id.value),
  });
  return addID(id.type, result);
}

export async function getByField(db, type, field, value) {
  const actualField = field === 'id' ? '_id' : field;
  const actualValue = field === 'id' ? ObjectId(value.value) : value;
  const result = await db.collection(type).findOne({
    [actualField]: actualValue,
  });
  return addID(type, result);
}

export function getCount(db, cursor) {
  return cursor.count();
}

export function getEdges(db, cursor) {
  return addTransform(cursor, (node) => ({
    node,
    cursor: {
      value: node._id,
    },
  })).toArray();
}

export function getNodes(db, cursor) {
  return cursor.toArray();
}

export function getPageInfo(db, promise) {
  return promise;
}
