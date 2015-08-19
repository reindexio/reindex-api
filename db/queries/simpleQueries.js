import RethinkDB from 'rethinkdb';

import {
  AUTHENTICATION_PROVIDER_TABLE,
  TYPE_TABLE,
  SECRET_TABLE,
  INDEX_TABLE,
} from '../DBConstants';
import { getFirstOrNullQuery, queryWithIDs } from './queryUtils';

export function getSecrets(conn) {
  return RethinkDB.table(SECRET_TABLE)
    .pluck('value')
    .coerceTo('array')
    .run(conn)
    .then((objects) => objects.map((object) => object.value));
}

export function getTypes(conn) {
  return RethinkDB.table(TYPE_TABLE)
    .coerceTo('array')
    .run(conn);
}

export function getIndexes(conn) {
  return RethinkDB.table(INDEX_TABLE)
    .coerceTo('array')
    .run(conn);
}

export function getAuthenticationProvider(conn, providerType) {
  return getFirstOrNullQuery(queryWithIDs(AUTHENTICATION_PROVIDER_TABLE,
    RethinkDB.table(AUTHENTICATION_PROVIDER_TABLE).filter({
      type: providerType,
    })
  )).run(conn);
}

export function getAllQuery(type) {
  return RethinkDB.table(type);
}

export function getByID(conn, id) {
  return getFirstOrNullQuery(
    queryWithIDs(id.type, RethinkDB.table(id.type).getAll(id.value))
  ).run(conn);
}

export function getCount(conn, query) {
  return query.count().run(conn);
}

export function getNodes(conn, query) {
  return query.coerceTo('array').run(conn);
}

export function getEdges(conn, query, cursorFn) {
  return query.map((node) => ({
    node,
    cursor: cursorFn(node),
  })).coerceTo('array').run(conn);
}

export function getPageInfo(conn, query) {
  if (query.run) {
    return query.run(conn);
  } else {
    return Promise.resolve(query);
  }
}
