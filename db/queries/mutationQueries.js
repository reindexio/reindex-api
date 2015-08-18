import RethinkDB from 'rethinkdb';

import {
  USER_TABLE,
} from '../DBConstants';
import {queryWithIDs} from './queryUtils';


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

function compactObject(object) {
  const result = {};
  for (const key of Object.keys(object)) {
    if (object[key] !== undefined) {
      result[key] = object[key];
    }
  }
  return result;
}
