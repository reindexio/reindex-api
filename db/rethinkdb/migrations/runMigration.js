import { listApps } from '../queries/appQueries';
import {
  getConnection,
  releaseConnection,
} from '../dbConnections';
import databaseNameFromHostname from '../databaseNameFromHostname';

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
  let conn;
  try {
    conn = await getConnection();
    const apps = await listApps(conn);
    console.log('Running migrations.');
    for (const app of apps) {
      console.log(`Migrating ${app}...`);
      await migrateApp(conn, app, queries);
    }
  } finally {
    await releaseConnection(conn);
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
