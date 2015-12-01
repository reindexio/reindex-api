import Promise from 'bluebird';
Promise.longStackTraces();
import uuid from 'uuid';

import Config from '../server/Config';
import { createAdminApp } from '../apps/createApp';
import DatabaseTypes from '../db/DatabaseTypes';
import deleteApp from '../apps/deleteApp';

const adminHostname = `test.admin.${uuid.v4()}.example.com`;

before(async () => {
  Config.resetTestConfig();

  const defaultCluster = process.env.DATABASE_TYPE === DatabaseTypes.RethinkDB ?
    'rethinkdb' :
    'mongodb';
  const adminDatabase = 'testadmin_' + uuid.v4().replace(/-/g, '_');

  Config.set('database.defaultCluster', defaultCluster);
  Config.set('database.adminCluster', defaultCluster);
  Config.set('database.adminDatabase', adminDatabase);

  await createAdminApp(adminHostname);
});

after(async () => {
  await deleteApp(adminHostname);
});
