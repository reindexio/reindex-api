import RethinkDB from 'rethinkdb';
import {
  AUTHENTICATION_PROVIDER_TABLE,
  TYPE_TABLE,
  SECRET_TABLE,
  USER_TABLE
} from './DBConstants';

function processIds(table, query) {
  return query.merge((obj) => ({
    id: {
      value: obj('id'),
      type: table,
    },
  }));
}

function getFirstOrNull(query) {
  return RethinkDB.branch(
    query.isEmpty(),
    null,
    query(0),
  );
}

export function getApp(context) {
  return RethinkDB.expr({}).merge({
    secrets: getSecrets(context),
    schema: getTypes(context),
  });
}

export function getSecrets({db}) {
  return processIds(
    SECRET_TABLE,
    db.table(SECRET_TABLE).coerceTo('array')
  );
}

export function getTypes({db}) {
  return db.table(TYPE_TABLE).coerceTo('array');
}

export function getAuthenticationProvider({db}, type) {
  return getFirstOrNull(processIds(
    AUTHENTICATION_PROVIDER_TABLE,
    db
      .table(AUTHENTICATION_PROVIDER_TABLE)
      .filter({type})
  ));
}

export async function getOrCreateUser(
  {db, conn},
  providerName,
  credential,
) {
  const table = db.table(USER_TABLE);

  const cursor = await processIds(
    USER_TABLE,
    table.filter((user) =>
      user('credentials')(providerName)('id').eq(credential.id)
    )
  ).run(conn);

  const users = await cursor.toArray();

  if (users.length) {
    return users[0];
  }

  return processIds(
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

export function getAll({db}, table) {
  return processIds(table, db.table(table));
}

export function getById({db}, table, id) {
  return getFirstOrNull(processIds(table, db.table(table).getAll(id.value)));
}

export function getAllByIndex({db}, table, indexValue, index) {
  return processIds(table, db.table(table).getAll(indexValue, {
    index,
  }));
}

export function getCount(query) {
  return query.count();
}

export function getNodes(query) {
  return query.coerceTo('array');
}

export function getEdges(query) {
  return query.map((node) => ({ node })).coerceTo('array');
}

export function processConnectionQuery(query, {
  first, after, orderBy,
}) {
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

export function create({db}, table, data) {
  return processIds(table, db.table(table).insert(compactObject(data), {
    returnChanges: true,
  })('changes')(0)('new_val'));
}

export function update({db}, table, id, data) {
  return processIds(
    table,
    db.table(table).get(id.value).update(compactObject(data), {
      returnChanges: true,
    })('changes')(0)('new_val')
  );
}

export function replace({db}, table, id, data) {
  const cleanData = compactObject(data);
  cleanData.id = id.value;
  return processIds(table, db.table(table).get(id.value).replace(cleanData, {
    returnChanges: true,
  })('changes')(0)('new_val'));
}

export function deleteQuery({db}, table, id) {
  return processIds(table, db.table(table).get(id.value).delete({
    returnChanges: true,
  })('changes')(0)('old_val'));
}
