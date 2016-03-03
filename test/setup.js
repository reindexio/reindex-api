import Promise from 'bluebird';
Promise.longStackTraces();
import uuid from 'uuid';

import Config from '../server/Config';
import DatabaseTypes from '../db/DatabaseTypes';
import deleteApp from '../apps/deleteApp';
import getAdminDB from '../db/getAdminDB';
import Monitoring from '../Monitoring';
import { createAdminApp } from '../apps/createApp';
import { TIMESTAMP } from '../graphQL/builtins/DateTime';

const adminHostname = `test.admin.${uuid.v4()}.example.com`;

before(async () => {
  Monitoring.setLogging(false);
  Config.resetTestConfig();

  const adminDatabase = 'testadmin_' + uuid.v4().replace(/-/g, '_');
  let settings;
  let defaultDatabaseType;
  if (process.env.DATABASE_TYPE === DatabaseTypes.RethinkDB) {
    settings = {
      type: DatabaseTypes.RethinkDB,
      host: 'localhost',
    };
    defaultDatabaseType = DatabaseTypes.RethinkDB;
  } else {
    settings = {
      type: DatabaseTypes.MongoDB,
      connectionString: 'mongodb://localhost/',
    };
    defaultDatabaseType = DatabaseTypes.MongoDB;
  }

  Config.set('database.adminDatabase', adminDatabase);
  Config.set('database.adminDatabaseSettings', JSON.stringify(settings));
  Config.set('database.defaultDatabaseType', defaultDatabaseType);

  await createAdminApp(adminHostname);
  await createStorage(settings);
});

after(async () => {
  await deleteApp(adminHostname);
});

async function createStorage(settings) {
  const adminDB = getAdminDB();
  try {
    await adminDB.create('Storage', {
      createdAt: TIMESTAMP,
      databasesAvailable: 200,
      settings,
    });
  } finally {
    await adminDB.close();
  }
}
