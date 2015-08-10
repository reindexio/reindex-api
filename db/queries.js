import RethinkDB from 'rethinkdb';

import {
  AUTHENTICATION_PROVIDER_TABLE,
  TYPE_TABLE,
  SECRET_TABLE,
  USER_TABLE
} from './DBConstants';

function queryWithIDs(type, query) {
  return query.merge((obj) => ({
    id: {
      type,
      value: obj('id'),
    },
  }));
}

function getFirstOrNullQuery(query) {
  return RethinkDB.branch(query.isEmpty(), null, query(0));
}

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

export function getAuthenticationProvider(conn, providerType) {
  return getFirstOrNullQuery(queryWithIDs(AUTHENTICATION_PROVIDER_TABLE,
    RethinkDB.table(AUTHENTICATION_PROVIDER_TABLE).filter({type: providerType})
  )).run(conn);
}

export async function getOrCreateUser(conn, providerName, credential) {
  const table = RethinkDB.table(USER_TABLE);

  const users = await queryWithIDs(USER_TABLE,
    table.filter((user) =>
      user('credentials')(providerName)('id').eq(credential.id)
    )
  ).coerceTo('array').run(conn);

  if (users.length) {
    return users[0];
  }

  return queryWithIDs(
    USER_TABLE,
    table.insert(
      {
        credentials: {
          [providerName]: credential,
        },
      },
      { returnChanges: true },
    )('changes')(0)('new_val'),
  ).run(conn);
}

export function getAllQuery(type) {
  return queryWithIDs(type, RethinkDB.table(type));
}

export function getByID(conn, id) {
  return getFirstOrNullQuery(
    queryWithIDs(id.type, RethinkDB.table(id.type).getAll(id.value))
  ).run(conn);
}

export function getAllByIndexQuery(type, indexValue, index) {
  return queryWithIDs(
    type,
    RethinkDB.table(type).getAll(indexValue, { index })
  );
}

export function getCount(conn, query) {
  return query.count().run(conn);
}

export function getNodes(conn, query) {
  return query.coerceTo('array').run(conn);
}

export function getEdges(conn, query) {
  return query.map((node) => ({ node })).coerceTo('array').run(conn);
}

export function processConnectionQuery(query, {first, after, orderBy}) {
  let paginatedQuery;
  if (orderBy) {
    let op = RethinkDB.asc;
    if (orderBy.startsWith('-')) {
      orderBy = orderBy.slice(1);
      op = RethinkDB.desc;
    }
    query = query.orderBy(op(orderBy));
  }

  if (first || after) {
    let slice = [after || 0];
    if (first) {
      slice = [slice[0], slice[0] + first];
    }
    paginatedQuery = query.slice(...slice);
  }

  return {
    query,
    paginatedQuery: paginatedQuery || query,
  };
}

function compactObject(object) {
  const result = {};
  for (const key of Object.keys(object)) {
    if (object[key] !== undefined) {
      result[key] = object[key];
    }
  }
  return result;
}

export function create(conn, type, data) {
  const query = RethinkDB.table(type)
    .insert(compactObject(data), {
      returnChanges: true,
    })('changes')(0)('new_val');
  return queryWithIDs(type, query).run(conn);
}

export function update(conn, type, id, data) {
  const query = RethinkDB.table(type)
    .get(id.value)
    .update(compactObject(data), {
      returnChanges: true,
    })('changes')(0)('new_val');
  return queryWithIDs(type, query).run(conn);
}

export function replace(conn, type, id, data) {
  const cleanData = compactObject(data);
  cleanData.id = id.value;
  const query = RethinkDB.table(type).get(id.value).replace(cleanData, {
    returnChanges: true,
  })('changes')(0)('new_val');
  return queryWithIDs(type, query).run(conn);
}

export function deleteQuery(conn, table, id) {
  const query = RethinkDB.table(table)
    .get(id.value)
    .delete({
      returnChanges: true,
    })('changes')(0)('old_val');
  return queryWithIDs(table, query).run(conn);
}
