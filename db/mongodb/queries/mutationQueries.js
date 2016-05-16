import { isEmpty, isPlainObject, omit, isEqual } from 'lodash';
import { ObjectId } from 'mongodb';

import { TIMESTAMP } from '../../../graphQL/builtins/DateTime';
import { getByID } from './simpleQueries';
import { addID, addTransform } from './queryUtils';

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
  const doc = prepareDocument(data);
  if (isEmpty(doc)) {
    return getByID(db, type, id);
  } else {
    const updated = await db.collection(type).findOneAndUpdate({
      _id: ObjectId(id.value),
    }, doc, {
      returnOriginal: false,
    });
    return addID(type, updated.value);
  }
}

export async function replace(db, type, id, data, oldObject) {
  const replaced = await db.collection(type).findOneAndUpdate({
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

export async function addToConnection(
  db,
  {
    fromType,
    fromId,
    fromField,
    toType,
    toId,
    toField,
  },
) {
  const [from, to] = await Promise.all([
    db.collection(fromType).findOneAndUpdate({
      _id: ObjectId(fromId.value),
    }, {
      $addToSet: {
        [fromField]: toId,
      },
    }),
    db.collection(toType).findOneAndUpdate({
      _id: ObjectId(toId.value),
    }, {
      $addToSet: {
        [toField]: fromId,
      },
    }),
  ]);

  return {
    from: addID(fromType, from.value),
    to: addID(toType, to.value),
  };
}

export async function removeFromConnection(
  db,
  {
    fromType,
    fromId,
    fromField,
    toType,
    toId,
    toField,
  },
) {
  const [from, to] = await Promise.all([
    db.collection(fromType).findOneAndUpdate({
      _id: ObjectId(fromId.value),
    }, {
      $pullAll: {
        [fromField]: [toId],
      },
    }),
    db.collection(toType).findOneAndUpdate({
      _id: ObjectId(toId.value),
    }, {
      $pullAll: {
        [toField]: [fromId],
      },
    }),
  ]);

  return {
    from: addID(fromType, from.value),
    to: addID(toType, to.value),
  };
}

export async function removeAllFromConnection(
  db,
  type,
  field,
  id,
  manyToMany,
) {
  let updateOperation;
  if (manyToMany) {
    updateOperation = {
      $pullAll: {
        [field]: [id],
      },
    };
  } else {
    updateOperation = {
      $set: {
        [field]: null,
      },
    };
  }

  const cursor = addTransform(db.collection(type).find({
    [field]: id,
  }), (object) => addID(type, object));

  const result = [];
  let bulk;
  while (await cursor.hasNext()) {
    if (!bulk) {
      bulk = db.collection(type).initializeUnorderedBulkOp();
    }
    const object = await cursor.next();
    bulk.find({ _id: ObjectId(object._id) }).update(updateOperation);
    if (manyToMany) {
      object[field] = object[field].filter((value) => !isEqual(value, id));
    } else {
      object[field] = null;
    }
    result.push(object);
  }
  if (bulk) {
    await bulk.execute();
  }
  return result;
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
  for (const key in object) {
    const value = object[key];
    if (isPlainObject(value)) {
      result.push(...(flattenUpdate(value, [...parentKey, key])));
    } else if (value !== undefined) {
      result.push([[...parentKey, key], value]);
    }
  }
  return result;
}
