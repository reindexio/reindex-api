import RethinkDB from 'rethinkdb';

import { getAllQuery } from './simpleQueries';
import {
  getIndexFromFields,
  ensureIndex,
  cursorToIndexKey
} from './indexes';
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
