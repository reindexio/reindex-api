import { ObjectId } from 'mongodb';
import { zipObject, isString } from 'lodash';

import { addID, addTransform } from './queryUtils';

export function getConnectionQueries(
  db,
  type,
  indexes = {},
  {
    keyPrefixFields = [],
    keyPrefix,
  },
  options = {},
) {

  const filter = zipObject(
    keyPrefixFields.map(
      (prefix) => isString(prefix) ? prefix : prefix.join('.')
    ),
    keyPrefix && keyPrefix.map((prefix) => prefix.toString())
  );
  return getPaginatedQuery(
    db, type, filter, options
  );
}

async function getPaginatedQuery(db, type, filter, {
  orderBy = {},
  before,
  after,
  first,
  last,
}) {
  const collection = db.collection(type);
  let query;
  const unpaginatedQuery = collection.find(filter);

  const field = (
    !orderBy.field || orderBy.field === 'id' ? '_id' : orderBy.field
  );
  const order = orderBy.order === 'DESC' ? -1 : 1;

  if (field !== '_id') {
    if (before) {
      const beforeObject = await db.collection(type).findOne({
        _id: ObjectId(before.value),
      }, {
        fields: {
          [field]: 1,
        },
      });
      filter = {
        $and: [
          filter,
        ],
      };
      filter.$and.push({
        $or: [
          {
            [field]: {
              $lt: beforeObject[field],
            },
          },
          {
            [field]: beforeObject[field],
            _id: { $lt: ObjectId(before.value) },
          },
        ],
      });
    }

    if (after) {
      const afterObject = await db.collection(type).findOne({
        _id: ObjectId(after.value),
      }, {
        fields: {
          [field]: 1,
        },
      });
      if (!filter.$and) {
        filter = {
          $and: [
            filter,
          ],
        };
      }
      filter.$and.push({
        $or: [
          {
            [field]: {
              $gt: afterObject[field],
            },
          },
          {
            [field]: afterObject[field],
            _id: { $gt: ObjectId(after.value) },
          },
        ],
      });
    }

    query = collection.find(filter).sort([
      [field, order],
      ['_id', order],
    ]);
  } else {
    if (before) {
      filter = {
        ...filter,
        _id: { $lt: ObjectId(before.value) },
      };
    }

    if (after) {
      filter = {
        ...filter,
        _id: { $gt: ObjectId(after.value) },
      };
    }

    query = collection.find(filter).sort([[field, order]]);
  }

  const pageInfo = {
    hasPreviousPage: false,
    hasNextPage: false,
  };
  let count = null;

  if (first) {
    count = await query.clone().count();
    query = query.limit(first);
    pageInfo.hasNextPage = count > first;
  }

  if (last) {
    if (count === null) {
      count = await query.clone().count();
    }
    query = query.skip(count - last);
    pageInfo.hasPreviousPage = count > last;
  }

  return {
    query: unpaginatedQuery,
    paginatedQuery: addTransform(query, (object) => addID(type, object)),
    pageInfo,
  };
}
