import { isEmpty, isPlainObject, forEach, omit } from 'lodash';
import { ObjectId } from 'mongodb';

import { TIMESTAMP } from '../../../graphQL/builtins/DateTime';
import { addID } from './queryUtils';

export async function getOrCreateUser(db, providerName, credential) {
  const result = await db.collection('User').findOneAndUpdate({
    [`credentials.${providerName}.id`]: credential.id,
  }, {
    $set: { [`credentials.${providerName}`]: credential },
  }, {
    upsert: true,
    returnOriginal: false,
  });

  return addID('User', result.value);
}

export async function create(db, type, data) {
  const id = ObjectId();
  const created = await db.collection(type).findOneAndUpdate({
    _id: id,
  }, prepareDocument(data), {
    upsert: true,
    returnOriginal: false,
  });
  return addID(type, created.value);
}

export async function update(db, type, id, data) {
  const updated = await db.collection(type).findOneAndUpdate({
    _id: ObjectId(id.value),
  }, prepareDocument(data), {
    returnOriginal: false,
  });
  return addID(type, updated.value);
}

export async function replace(db, type, id, data, oldObject) {
  const replaced = await db.collection(type).findOneAndReplace({
    _id: ObjectId(id.value),
  }, prepareDocument(data, oldObject), {
    returnOriginal: false,
  });
  return addID(type, replaced.value);
}

export async function deleteQuery(db, type, id) {
  const deleted = await db.collection(type).findOneAndDelete({
    _id: ObjectId(id.value),
  }, {
    returnOriginal: true,
  });
  return addID(type, deleted.value);
}

function prepareDocument(object, oldObject = {}) {
  const fields = flattenUpdate(object);
  const oldFields = flattenUpdate(omit(oldObject, ['_id', 'id']));
  const sets = {};
  const currentDate = {};
  const unsets = {};

  for (const [keys, value] of fields) {
    const key = keys.join('.');
    if (value === TIMESTAMP) {
      currentDate[key] = true;
    } else {
      sets[key] = value;
    }
  }

  for (const [keys] of oldFields) {
    const key = keys.join('.');
    if (!(key in sets || key in currentDate)) {
      unsets[key] = true;
    }
  }

  const result = {};
  if (!isEmpty(sets)) {
    result.$set = sets;
  }

  if (!isEmpty(unsets)) {
    result.$unset = unsets;
  }

  if (!isEmpty(currentDate)) {
    result.$currentDate = currentDate;
  }

  return result;
}

function flattenUpdate(object, parentKey = []) {
  const result = [];
  forEach(object, (value, key) => {
    if (isPlainObject(value)) {
      result.push(...(flattenUpdate(value, [...parentKey, key])));
    } else if (value !== undefined) {
      result.push([[...parentKey, key], value]);
    }
  });
  return result;
}
