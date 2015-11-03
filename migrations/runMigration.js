import RethinkDB from 'rethinkdb';

import listApps from '../apps/listApps';
import Config from '../server/Config';
import databaseNameFromHostname from '../server/databaseNameFromHostname';

/**
 * Tool for running multiple RethinkDB queries against all apps. To be used for
 * running migration scripts.
 *
 * Migration workflow:
 * 1. Include migrations in the feature branch
 * 2. Migration script is reviewed
 * 3. Migration is run after 'ship it' is cleared for the branch, but before
 *    merge
 * 4. After migration succeeds, merge is performed
 *
 * Migration should be a script with name `XXXX_description.js` that has a date
 * and description inside in comments.
 **/
export default async function runMigration(queries) {
  const apps = await listApps();
  let conn;
  console.log('Running migrations.');
  try {
    conn = await RethinkDB.connect(Config.get('RethinkDBPlugin'));
    for (const app of apps) {
      console.log(`Migrating ${app}...`);
      await migrateApp(conn, app, queries);
    }
  } finally {
    if (conn) {
      await conn.close();
    }
  }
  console.log('Done!');
}

async function migrateApp(conn, app, queries) {
  const dbName = databaseNameFromHostname(app);
  conn.use(dbName);
  for (const query of queries) {
    await query.run(conn);
  }
}
