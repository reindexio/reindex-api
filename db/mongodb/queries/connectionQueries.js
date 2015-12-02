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

  if (field === '_id') {
    query = limitQueryWithId(collection, filter, order, before, after);
  } else {
    query = await limitQuery(collection, filter, field, order, before, after);
  }

  const pageInfo = await applyPagination(query, first, last);

  return {
    query: unpaginatedQuery,
    paginatedQuery: addTransform(query, (object) =>
      addID(type, object)
    ),
    pageInfo,
  };
}

// When limiting results with `before` and `after` an object in the database
// should be in the result set in one of the three cases:
//
// * Object is between before and after, non-inclusive
// * Object has same sort field value as before cursor, but is stably sorted
//   to be after it
// * Object has same sort field value as after cursor, but is stably sorted
//   to be before it
//
// We provide stable sorting by always also sorting by `_id`. In addition this
// means that in the last two cases we also need to filter the `_id`.
//
// There are many ways to do it mongo, several experiments shown that it's best
// to have all those three cases on top level in an $or; in this case we have
// at most three index hits, with no non-index filtering or sorting.
async function limitQuery(collection, filter, field, order, before, after) {
  let finalFilter = filter;
  const limits = {};
  const ors = [];
  if (before) {
    const op = order === 1 ? '$lt' : '$gt';
    const beforeObject = await collection.findOne({
      _id: ObjectId(before.value),
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[op] = beforeObject[field];
    ors.push(
      {
        ...filter,
        [field]: beforeObject[field],
        _id: { [op]: ObjectId(before.value) },
      },
    );
  }

  if (after) {
    const op = order === 1 ? '$gt' : '$lt';
    const afterObject = await collection.findOne({
      _id: ObjectId(after.value),
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[op] = afterObject[field];
    ors.push(
      {
        ...filter,
        [field]: afterObject[field],
        _id: { [op]: ObjectId(after.value) },
      },
    );
  }

  if (before || after) {
    finalFilter = {
      $or: [
        {
          ...filter,
          [field]: limits,
        },
        ...ors,
      ],
    };
  }

  return collection.find(finalFilter).sort([
    // Adding sort by all index keys to force mongo to use index
    ...Object.keys(filter).map((key) => [key, order]),
    [field, order],
    ['_id', order],
  ]);
}

function limitQueryWithId(collection, filter, order, before, after) {
  if (before || after) {
    filter = {
      ...filter,
      _id: {},
    };
  }

  if (before) {
    const op = order === 1 ? '$lt' : '$gt';
    filter._id[op] = ObjectId(before.value);
  }

  if (after) {
    const op = order === 1 ? '$gt' : '$lt';
    filter._id[op] = ObjectId(after.value);
  }

  return collection.find(filter).sort([['_id', order]]);
}

async function applyPagination(query, first, last) {
  let count;

  if (first || last) {
    count = await query.clone().count();
    let limit;
    let skip;

    if (first && count > first) {
      limit = first;
    }

    if (last) {
      if (limit && limit > last) {
        skip = limit - last;
        limit = limit - skip;
      } else if (!limit && count > last) {
        skip = count - last;
      }
    }

    if (skip) {
      query.skip(skip);
    }

    if (limit) {
      query.limit(limit);
    }

  }

  return {
    hasNextPage: Boolean(first && count > first),
    hasPreviousPage: Boolean(last && count > last),
  };
}
