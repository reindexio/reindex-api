/* eslint-disable max-len */
import { ObjectId } from 'mongodb';

import { UserError } from '../../../graphQL/UserError';
import { addID, addTransform } from './queryUtils';

export function getConnectionQueries(
  db,
  type,
  filter = [],
  args = {},
  context,
) {
  if (args.before && !ObjectId.isValid(args.before.value)) {
    throw new UserError('Invalid `before` cursor');
  }

  if (args.after && !ObjectId.isValid(args.after.value)) {
    throw new UserError('Invalid `after` cursor');
  }

  const unsortableKeys = new Set(
    context.typeRegistry.getTypeSet(type).getFilters().map(({ name }) => name)
  );

  return getPaginatedQuery(
    db,
    type,
    filtersToMongo(filter),
    unsortableKeys,
    args,
  );
}

class Query {
  constructor(cursor) {
    this._cursor = cursor;
  }

  getCursor() {
    return this._cursor;
  }

  getNodes() {
    return this.toArray();
  }

  async getEdges() {
    return (await this.toArray()).map((node) => ({
      node,
      cursor: {
        value: node._id,
      },
    }));
  }

  async toArray() {
    if (!this._cache) {
      this._cache = this._cursor.toArray();
    }
    return await this._cache;
  }
}

async function getPaginatedQuery(db, type, filter, unsortableKeys, {
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
    query = limitQueryWithId(collection, filter, order, before, after, unsortableKeys);
  } else {
    query = await limitQuery(collection, filter, field, order, before, after, unsortableKeys);
  }

  const pageInfo = await applyPagination(query, first, last);

  return {
    query: unpaginatedQuery,
    paginatedQuery: new Query(addTransform(query, (object) =>
      addID(type, object)
    )),
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
async function limitQuery(collection, filter, field, order, before, after, unsortableKeys) {
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

  const sort = getSort(filter, field, order, unsortableKeys);

  return collection.find(finalFilter).sort(sort);
}

function limitQueryWithId(collection, filter, order, before, after, unsortableKeys) {
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

  const sort = getSort(filter, '_id', order, unsortableKeys);

  return collection.find(filter).sort(sort);
}

function getSort(filter, field, order, unsortableKeys) {
  const allFilterKeys = [
    ...Object.keys(filter).filter((key) => key !== '$and'),
    ...(filter.$and || []).map((part) => Object.keys(part)[0]),
  ];
  const sort = [
    ...allFilterKeys
      .filter((key) => !unsortableKeys.has(key))
      .map((key) => [key, order]),
    [field, order],
  ];
  if (field !== 'id') {
    sort.push(['_id', order]);
  }
  return sort;
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

function filtersToMongo(filters) {
  const mongoFilters = filters.map(filterToMongo);
  return mongoFilters.reduce(mergeFilters, {});
}

function mergeFilters(filters, next) {
  return {
    ...filters,
    $and: [
      ...filters.$and || [],
      next,
    ],
  };
}

const OP_TO_MONGO = {
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  neq: '$ne',
  includes: '$in',
  excludes: '$nin',
};

function filterToMongo(filter) {
  const { field, op, value } = filter;
  if (op === 'isNull') {
    if (value) {
      return {
        [field]: null,
      };
    } else {
      return {
        [field]: {
          $ne: null,
        },
      };
    }
  } else if (op === 'eq') {
    return {
      [field]: value,
    };
  } else if (op === 'includes' || op === 'excludes') {
    return {
      [field]: {
        [OP_TO_MONGO[op]]: [value],
      },
    };
  } else {
    return {
      [field]: {
        [OP_TO_MONGO[op]]: value,
      },
    };
  }
}
