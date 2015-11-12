import Cryptiles from 'cryptiles';
import RethinkDB from 'rethinkdb';
import { values } from 'lodash';

import { getConnection, releaseConnection } from '../db/dbConnections';
import databaseNameFromHostname from '../server/databaseNameFromHostname';
import * as DBTableNames from '../db/DBTableNames';

export default async function createApp(hostname) {
  const dbName = databaseNameFromHostname(hostname);
  let conn;
  let secret;
  try {
    conn = await getConnection();
    await createDatabase(conn, dbName);
    secret = await createSecret(conn);
  } finally {
    await releaseConnection(conn);
  }

  return {
    hostname,
    dbName,
    secret,
  };
}

async function createDatabase(conn, dbName) {
  await RethinkDB.dbCreate(dbName).run(conn);
  conn.use(dbName);
  await* values(DBTableNames).map((tableName) =>
    RethinkDB.db(dbName).tableCreate(tableName).run(conn)
  );

  await RethinkDB.db(dbName).table(DBTableNames.TYPE_TABLE).insert({
    name: 'User',
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
    ],
    kind: 'OBJECT',
    interfaces: ['Node'],
  }).run(conn);

  await RethinkDB.db(dbName).table(DBTableNames.PERMISSION_TABLE).insert({
    type: null,
    user: null,
    read: true,
    create: true,
    update: true,
    delete: true,
  }).run(conn);
}

function generateSecret() {
  return Cryptiles.randomString(40);
}

async function createSecret(conn) {
  const secret = generateSecret();
  await RethinkDB.table(DBTableNames.SECRET_TABLE)
    .insert({ value: secret })
    .run(conn);
  return secret;
}
