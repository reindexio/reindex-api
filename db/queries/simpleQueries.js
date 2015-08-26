import RethinkDB from 'rethinkdb';

import injectDefaultFields from '../../graphQL/builtins/injectDefaultFields';
import {
  AUTHENTICATION_PROVIDER_TABLE,
  TYPE_TABLE,
  SECRET_TABLE,
  INDEX_TABLE,
  PERMISSION_TABLE,
} from '../DBTableNames';
import {
  getFirstOrNullQuery,
  queryWithIDs,
} from './queryUtils';

export async function getSecrets(conn) {
  const objects = await RethinkDB.table(SECRET_TABLE)
    .pluck('value')
    .coerceTo('array')
    .run(conn);
  return objects.map((object) => object.value);
}

export async function getTypes(conn) {
  const types = await RethinkDB.table(TYPE_TABLE).coerceTo('array').run(conn);
  return types.map((type) => {
    type.fields = injectDefaultFields(type);
    return type;
  });
}

export function getIndexes(conn) {
  return RethinkDB.table(INDEX_TABLE)
    .coerceTo('array')
    .run(conn);
}

export async function getMetadata(conn) {
  const result = await RethinkDB.do(
    RethinkDB.table(TYPE_TABLE).coerceTo('array'),
    RethinkDB.table(INDEX_TABLE).coerceTo('array'),
    RethinkDB.table(PERMISSION_TABLE).coerceTo('array'),
    (types, indexes, permissions) => ({
      types,
      indexes,
      permissions,
    })
  ).run(conn);
  result.types = result.types.map((type) => {
    type.fields = injectDefaultFields(type);
    return type;
  });
  return result;
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
