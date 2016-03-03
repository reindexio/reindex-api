import assert from 'assert';
import Cryptiles from 'cryptiles';
import { ObjectId } from 'mongodb';

import AdminReindexSchema from '../ReindexSchema.json';
import buildSchemaMigration from '../graphQL/migrations/buildSchemaMigration';
import createDBClient from '../db/createDBClient';
import Config from '../server/Config';
import getCluster from '../db/getCluster';
import getAdminDB from '../db/getAdminDB';
import { TIMESTAMP } from '../graphQL/builtins/DateTime';
import DefaultUserType from '../graphQL/builtins/DefaultUserType';

const hostnamePattern = /^[0-9a-z.\-]+$/;

export default function createApp(
  hostname,
  clusterName = Config.get('database.defaultCluster')
) {
  return _createApp(hostname, clusterName);
}

export function createAdminApp(hostname) {
  return _createApp(
    hostname,
    Config.get('database.adminCluster'),
    AdminReindexSchema,
    Config.get('database.adminDatabase'),
  );
}


async function _createApp(
  hostname,
  clusterName,
  types = null,
  dbName = ObjectId().toString(),
) {
  let adminDB;
  let app;
  let secret;

  assert(hostnamePattern.test(hostname), 'Invalid hostname.');

  const cluster = getCluster(clusterName);
  const db = createDBClient(hostname, dbName, cluster);

  try {
    ({ secret } = await createEmptyDatabase(db, types));
    adminDB = getAdminDB(hostname);
    app = await createAppMetadata(adminDB, hostname, {
      cluster: clusterName,
      name: dbName,
    });
  } finally {
    await db.close();
    if (adminDB) {
      await adminDB.close();
    }
  }
  return {
    ...app,
    secret,
  };
}

async function createEmptyDatabase(db, types) {
  await db.createStorageForApp();
  await db.create('ReindexType', DefaultUserType);
  const secret = Cryptiles.randomString(40);
  await db.create('ReindexSecret', { value: secret });
  if (types) {
    await db.performMigration(
      buildSchemaMigration([DefaultUserType], types),
      types,
      { indexes: {} }
    );
  }

  return { secret };
}

async function createAppMetadata(adminDB, hostname, database) {
  const app = await adminDB.create('App', {
    createdAt: TIMESTAMP,
    database,
  });
  const domain = await adminDB.create('Domain', {
    app: app.id,
    createdAt: TIMESTAMP,
    hostname,
  });
  return {
    ...app,
    domains: [
      domain,
    ],
  };
}
