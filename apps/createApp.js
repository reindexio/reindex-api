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

const hostnamePattern = /^[0-9a-z.\-]+$/;

const defaultUserType = {
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
};

export default function createApp(
  hostname,
  clusterName = Config.get('database.defaultCluster')
) {
  return _createApp(hostname, clusterName, true);
}

export function createAdminApp(hostname) {
  return _createApp(
    hostname,
    Config.get('database.adminCluster'),
    false,
    AdminReindexSchema,
    Config.get('database.adminDatabase'),
  );
}


async function _createApp(
  hostname,
  clusterName,
  addWildcardPermission,
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
    ({ secret } = await createEmptyDatabase(db, types, addWildcardPermission));
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

async function createEmptyDatabase(db, types, addWildcardPermission) {
  await db.createStorageForApp();
  await db.create('ReindexType', defaultUserType);
  if (addWildcardPermission) {
    await db.create('ReindexPermission', {
      type: null,
      user: null,
      read: true,
      create: true,
      update: true,
      delete: true,
    });
  }
  const secret = Cryptiles.randomString(40);
  await db.create('ReindexSecret', { value: secret });
  if (types) {
    await db.performMigration(buildSchemaMigration([defaultUserType], types));
  }

  return { secret };
}

async function createAppMetadata(adminDB, hostname, database) {
  const app = await adminDB.create('App', {
    createdAt: TIMESTAMP,
    database,
  });
  await adminDB.create('Domain', {
    app: app.id,
    createdAt: TIMESTAMP,
    hostname,
  });
  return app;
}
