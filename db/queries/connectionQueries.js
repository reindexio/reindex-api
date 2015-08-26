import uuid from 'uuid';
import { find, isEqual, isString } from 'lodash';
import RethinkDB from 'rethinkdb';

import {
  INDEX_TABLE,
} from '../DBTableNames';
import { getAllQuery } from './simpleQueries';
import { queryWithIDs } from './queryUtils';

// Produce queries required to handle connection.
//
// Handles common arguments that is used in all connections, such as
// filtering, ordering and Relay-compatible pagination.
//
// Parameters:
//
// * `conn`: RethinkDB connection
// * `type`: Type that connection refers to
// * `indexes`: Array of indexes for the type
// * `indexParameters`: an object with a known data about the index.
//    For example, if we are following a connection from some parent object
//    This would hold information about field that holds parent object
//    information. Has two fields:
//   * `keyPrefixFields`: know fields of the index key
//   * `keyPrefix`: known values of the index key
// * `args`: object of connection arguments. Currently supported: `orderBy`,
//   `before`, `after`, `first`, `last`
//
// Returns:
//
// * `query` - an unpaginated, but ordered and filtered query
// * `paginatedQuery` - paginated query
// * `cursorFn` - a RethinkDB function that returns cursor for given object
// * `pageInfo` - a query or an object of PageInfo
export async function getConnectionQueries(
  conn,
  type,
  indexes = {},
  {
    keyPrefixFields = [],
    keyPrefix,
  },
  {
    orderBy,
    before,
    after,
    ...args,
  }
) {
  const query = getAllQuery(type);
  // Select index fields by combining known index fields and ordering,
  // falling back to id if ordering is not provided.
  if (!orderBy) {
    orderBy = {};
  }
  const indexFields = [
    ...keyPrefixFields,
    orderBy.field ? [orderBy.field] : ['id'],
  ];
  let index = getIndexFromFields(indexes, indexFields);
  if (!index) {
    index = await ensureIndex(conn, type, indexFields);
  }

  const paddingSize = indexFields.length - keyPrefixFields.length;

  // We create cursor-less index keys for query that is used for
  // counting.
  const unpaginatedBeforeIndexKey = cursorToIndexKey(
    type,
    index,
    null,
    keyPrefix,
    paddingSize,
    RethinkDB.maxval
  );
  const unpaginatedAfterIndexKey = cursorToIndexKey(
    type,
    index,
    null,
    keyPrefix,
    paddingSize,
    RethinkDB.minval
  );
  // Keys for normal query
  const beforeIndexKey = cursorToIndexKey(
    type,
    index,
    before,
    keyPrefix,
    paddingSize,
    RethinkDB.maxval
  );
  const afterIndexKey = cursorToIndexKey(
    type,
    index,
    after,
    keyPrefix,
    paddingSize,
    RethinkDB.minval
  );

  const cursorFn = (obj) => ({
    index: index.name,
    value: obj('id')('value'),
  });

  const {
    query: paginatedQuery,
    pageInfo,
  } = paginateQuery(conn, type, index, query, {
    ...args,
    before: beforeIndexKey,
    after: afterIndexKey,
    order: orderBy.order,
  });

  return {
    paginatedQuery: queryWithIDs(type, paginatedQuery),
    query: queryWithIDs(
      type,
      paginateQuery(conn, type, index, query, {
        before: unpaginatedBeforeIndexKey,
        after: unpaginatedAfterIndexKey,
        order: orderBy.order,
      }).query
    ),
    pageInfo,
    cursorFn,
  };
}

function paginateQuery(conn, type, index, query, {
  first,
  last,
  before,
  after,
  order = 'ASC',
}) {
  let op = RethinkDB.asc;
  if (order === 'DESC') {
    op = RethinkDB.desc;
  }

  query = query.orderBy({ index: op(index.name) });

  if (before || after) {
    query = RethinkDB.do(
      after,
      before,
      (left, right) => query.between(left, right, {
        index: index.name,
        leftBound: 'open',
        rightBound: 'open',
      })
    );
  }

  let pageInfo = {
    hasPreviousPage: false,
    hasNextPage: false,
  };
  if (first || last) {
    pageInfo = RethinkDB.do(
      query.count(),
      (count) => ({
        hasNextPage: first ? count.gt(first) : false,
        hasPreviousPage: last ? count.gt(last) : false,
      }),
    );
  }

  if (first) {
    query = query.limit(first);
  }

  if (last) {
    query = RethinkDB.do(
      query.count(),
      (count) => RethinkDB.branch(
        count.gt(last),
        query.skip(count.sub(last)),
        query
      )
    );
  }

  return {
    query,
    pageInfo,
  };
}

// RethinkDB get an array of values, given a possibly nested list of
// accesor keys. Like immutable .map((keys) => o.getIn([...keys])
function getIndexValue(obj, fields) {
  return fields.map((part) => {
    if (isString(part)) {
      return obj(part);
    } else {
      return part.reduce((chain, next) => chain(next), obj);
    }
  });
}

const ID_FIELDS = [['id']];

// Find an index by fields, unless it's a primary key index
function getIndexFromFields(indexes, fields) {
  if (isEqual(ID_FIELDS, fields)) {
    return {
      name: 'id',
      fields: ID_FIELDS,
    };
  } else {
    return find(indexes, (index) => isEqual(fields, index.fields));
  }
}

async function ensureIndex(conn, type, fields) {
  const name = uuid.v4();
  // TODO(freiksenet, 2015-08-17): Fails if you try to create indexes
  // concurrently
  await RethinkDB.table(type).indexCreate(name, (obj) => (
    getIndexValue(obj, fields)
  )).run(conn);
  await RethinkDB.do(
    RethinkDB.table(type).indexWait(name),
    () => RethinkDB.table(INDEX_TABLE).insert({
      type,
      name,
      fields,
    })
  ).run(conn);

  return {
    name,
    type,
    fields,
  };
}

// Convert a cursor to either a valid RethinkDB value or a RethinkDB query
// that can be used as index key
//
// Parameters:
//
// * `type` - type we are querying
// * `index` - index we are querying
// * `cursor` - Cursor or null
// * `keyPrefix` - Arrray of known index values
// * `paddingSize` - count of unknown index values of the key
// * `defaultValue` - default value to use for unknown values of the key
//   (usually r.minval/r.maxval)
function cursorToIndexKey(
  type,
  index,
  cursor,
  keyPrefix,
  paddingSize,
  defaultValue,
) {
  if (cursor && cursor.index !== index.name) {
    throw new Error(
      `Invalid cursor`
    );
  } else if (cursor) {
    // Valid cursor is always enough, we retrieve the object it points to
    // to get between data
    return RethinkDB.do(
      RethinkDB.table(type).get(cursor.value),
      (result) => RethinkDB.branch(
        result,
        getIndexValue(result, index.fields),
        defaultValue
      )
    );
  } else if (keyPrefix) {
    // No cursor passed, we create between data from data we already have
    // and pad the unavailable values with base (either minval or maxval)
    return [
      ...keyPrefix,
      ...(new Array(paddingSize).fill(defaultValue)),
    ];
  } else {
    return defaultValue;
  }
}
