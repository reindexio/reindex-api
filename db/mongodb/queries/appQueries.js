import Cryptiles from 'cryptiles';
import JSONWebToken from 'jsonwebtoken';

import { getSecrets } from './simpleQueries';
import hostnameFromDatabaseName from '../hostnameFromDatabaseName';

export async function createApp(db) {
  await db.collection('ReindexType').insert({
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
  });

  await db.collection('ReindexPermission').insert({
    type: null,
    user: null,
    read: true,
    create: true,
    update: true,
    delete: true,
  });

  const secret = Cryptiles.randomString(40);
  await db.collection('ReindexSecret').insert({
    value: secret,
  });

  return {
    secret,
  };
}

// XXX(freiksenet, 2015-11-25): Inside one cluster
export async function hasApp(db, dbName) {
  const dbList = (await db.admin().listDatabases())
    .databases
    .map((dbInfo) => dbInfo.name);
  return dbList.includes(dbName);
}

export async function deleteApp(db) {
  await db.dropDatabase();
}

// XXX(freiksenet, 2015-11-25): Inside one cluster
export async function listApps(db) {
  const dbList = (await db.admin().listDatabases())
    .databases
    .map((dbInfo) => dbInfo.name);
  return dbList
    .filter((dbName) => /^r_/.test(dbName))
    .map(hostnameFromDatabaseName)
    .sort();
}

export async function createToken(db, params) {
  const { admin, user } = {
    admin: false,
    user: null,
    ...params,
  };
  const secrets = await getSecrets(db);
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
