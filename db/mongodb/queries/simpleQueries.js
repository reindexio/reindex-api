import { transform, isArray } from 'lodash';
import { ObjectId } from 'mongodb';
import { GraphQLError } from 'graphql/error/GraphQLError';

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
  const metadata = await* [
    getTypes(db),
    getIndexes(db),
    getAllQuery(db, 'ReindexHook').toArray(),
  ];
  return {
    types: metadata[0],
    indexes: metadata[1],
    hooks: metadata[2],
  };
}

export async function getByID(db, type, id) {
  if (!isValidID(type, id)) {
    throw new GraphQLError(`Invalid ID for type ${type}`);
  }
  const result = await db.collection(type).findOne({ _id: ObjectId(id.value) });
  return addID(type, result);
}

export async function getByField(db, type, field, value) {
  let actualField = field;
  let actualValue = value;

  if (isArray(field)) {
    actualField = field.join('.');
  }

  if (actualField === 'id') {
    actualField = '_id';
    actualValue = ObjectId(value.value);
  }

  const result = await db.collection(type).findOne({
    [actualField]: actualValue,
  });
  return addID(type, result);
}

function getAllByFilter(db, type, filter) {
  const cleanFilter = transform(filter, (result, value, key) => {
    if (key === 'id') {
      result._id = new ObjectId(value.value);
    } else {
      result[key] = value;
    }
  });
  return db.collection(type).find(cleanFilter);
}

export async function hasByFilter(db, type, filter) {
  const result = await getAllByFilter(db, type, filter).limit(1).count();
  return result > 0;
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
