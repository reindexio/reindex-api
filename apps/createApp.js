import assert from 'assert';
import Cryptiles from 'cryptiles';
import { ObjectId } from 'mongodb';

import AdminReindexSchema from '../ReindexSchema.json';
import buildSchemaMigration from '../graphQL/migrations/buildSchemaMigration';
import createDBClient from '../db/createDBClient';
import Config from '../server/Config';
import DefaultUserType from '../graphQL/builtins/DefaultUserType';
import getAdminDB from '../db/getAdminDB';
import DatabaseTypes from '../db/DatabaseTypes';
import { TIMESTAMP } from '../graphQL/builtins/DateTime';

const hostnamePattern = /^[0-9a-z.\-]+$/;

export default async function createApp(
  hostname,
  databaseType = Config.get('database.defaultDatabaseType'),
) {
  assert(hostnamePattern.test(hostname), 'Invalid hostname.');
  assert(Object.values(DatabaseTypes).includes(databaseType),
    `Invalid database type: ${databaseType}`);

  const storage = await allocateStorage(databaseType, hostname);

  let app;
  let secret;
  const dbName = storage.databaseName || ObjectId().toString();
  const db = createDBClient(hostname, dbName, storage.settings);
  const adminDB = getAdminDB(hostname);

  try {
    secret = await createEmptyDatabase(db);
    app = await createAppMetadata(adminDB, hostname, dbName, storage);
  } finally {
    await db.close();
    await adminDB.close();
  }
  return {
    ...app,
    secret,
  };
}

export async function createAdminApp(hostname) {
  assert(hostnamePattern.test(hostname), 'Invalid hostname.');

  const dbName = Config.get('database.adminDatabase');
  const adminDB = getAdminDB(hostname);
  try {
    await createEmptyDatabase(adminDB, AdminReindexSchema);
    const storage = await adminDB.create('Storage', {
      createdAt: TIMESTAMP,
      databasesAvailable: 100,
      settings: JSON.parse(Config.get('database.adminDatabaseSettings')),
    });
    await createAppMetadata(adminDB, hostname, dbName, storage);
  } finally {
    await adminDB.close();
  }
}


async function createEmptyDatabase(db, types) {
  await db.createDatabaseForApp();
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

  return secret;
}

async function createAppMetadata(adminDB, hostname, dbName, storage) {
  const app = await adminDB.create('App', {
    createdAt: TIMESTAMP,
    database: {
      name: dbName,
    },
    storage: storage.id,
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

async function allocateStorage(type, hostname) {
  let adminDB;
  try {
    adminDB = getAdminDB(hostname);
    return await adminDB.allocateStorage(type);
  } finally {
    await adminDB.close();
  }
}
