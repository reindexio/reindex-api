import Cryptiles from 'cryptiles';
import { values } from 'lodash';
import RethinkDB from 'rethinkdb';
import JSONWebToken from 'jsonwebtoken';

import hostnameFromDatabaseName from '../hostnameFromDatabaseName';
import * as DBTableNames from '../DBTableNames';
import { getSecrets } from './simpleQueries';

export async function createApp(conn, dbName) {
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

  const secret = await createSecret(conn);

  return {
    secret,
  };
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


export async function hasApp(conn, dbName) {
  const dbList = await RethinkDB.dbList().run(conn);
  return dbList.includes(dbName);
}

export async function deleteApp(conn, dbName) {
  await RethinkDB.dbDrop(dbName).run(conn);
}

export async function listApps(conn) {
  const dbList = await RethinkDB.dbList().run(conn);
  return dbList
    .filter((dbName) => /^reindex_/.test(dbName))
    .map(hostnameFromDatabaseName)
    .sort();
}

export async function createToken(conn, params) {
  const { admin, user } = {
    admin: false,
    user: null,
    ...params,
  };
  const secrets = await getSecrets(conn);
  const secret = secrets[0];

  const payload = {
    isAdmin: admin,
  };

  const options = {};
  if (user) {
    options.subject = user;
  }

  return JSONWebToken.sign(payload, secret, options);
}
