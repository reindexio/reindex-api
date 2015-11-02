import RethinkDB from 'rethinkdb';

import { getConnection, releaseConnection } from '../db/dbConnections';
import hostnameFromDatabaseName from '../server/hostnameFromDatabaseName';

export default async function listApps() {
  let conn;
  try {
    conn = await getConnection();
    const dbList = await RethinkDB.dbList().run(conn);
    return dbList
      .filter((dbName) => /^reindex_/.test(dbName))
      .map(hostnameFromDatabaseName)
      .sort();
  } finally {
    await releaseConnection(conn);
  }
}
