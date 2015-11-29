import RethinkDB from 'rethinkdb';

import { TIMESTAMP } from '../../../graphQL/builtins/DateTime';
import { USER_TABLE } from '../DBTableNames';
import { queryWithIDs } from './queryUtils';

export async function getOrCreateUser(conn, providerName, credential) {
  const table = RethinkDB.table(USER_TABLE);

  const users = await queryWithIDs(USER_TABLE,
    table.filter((user) =>
      user('credentials')(providerName)('id').eq(credential.id)
    )
  ).coerceTo('array').run(conn);

  if (users.length) {
    const user = users[0];
    const changes = {
      credentials: {
        ...user.credentials,
        [providerName]: credential,
      },
    };
    await table.get(user.id.value).update(changes).run(conn);
    return {
      ...user,
      ...changes,
    };
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

function getCreateQuery(type, data) {
  return RethinkDB.table(type)
    .insert(compactObject(data), {
      returnChanges: true,
    })('changes')(0)('new_val');
}

export function create(conn, type, data) {
  return queryWithIDs(type, getCreateQuery(type, data)).run(conn);
}

function getUpdateQuery(type, id, data) {
  return RethinkDB.table(type)
    .get(id.value)
    .update(compactObject(data), {
      returnChanges: 'always',
    })('changes')(0)('new_val');
}

export function update(conn, type, id, data) {
  return queryWithIDs(type, getUpdateQuery(type, id, data)).run(conn);
}

function getReplaceQuery(type, id, data) {
  const cleanData = compactObject(data);
  cleanData.id = id.value;
  return RethinkDB.table(type).get(id.value).replace(cleanData, {
    returnChanges: 'always',
  })('changes')(0)('new_val');
}

export function replace(conn, type, id, data) {
  return queryWithIDs(type, getReplaceQuery(type, id, data)).run(conn);
}

function getDeleteQuery(type, id) {
  return RethinkDB.table(type)
    .get(id.value)
    .delete({
      returnChanges: true,
    })('changes')(0)('old_val');
}

export function deleteQuery(conn, type, id) {
  return queryWithIDs(type, getDeleteQuery(type, id)).run(conn);
}

export function createType(conn, type) {
  if (type.interfaces.includes('Node')) {
    return queryWithIDs('ReindexType', RethinkDB.do(
      RethinkDB.tableCreate(type.name),
      () => getCreateQuery('ReindexType', type)
    )).run(conn);
  } else {
    return create(conn, 'ReindexType', type);
  }
}

export function deleteType(conn, id) {
  return queryWithIDs('ReindexType', RethinkDB.do(
    getDeleteQuery('ReindexType', id),
    (result) => RethinkDB.do(
      RethinkDB.branch(
        result('interfaces').contains('Node'),
        RethinkDB.tableDrop(result('name')),
        {}
      ),
      () => result
    )
  )).run(conn);
}

function compactObject(object) {
  const result = {};
  for (const key of Object.keys(object)) {
    if (object[key] === TIMESTAMP) {
      result[key] = RethinkDB.now();
    } else if (object[key] !== undefined) {
      result[key] = object[key];
    }
  }
  return result;
}
