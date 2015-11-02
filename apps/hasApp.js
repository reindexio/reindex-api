import RethinkDB from 'rethinkdb';

import { getConnection, releaseConnection } from '../db/dbConnections';
import databaseNameFromHostname from '../server/databaseNameFromHostname';

export default async function hasApp(hostname) {
  const dbName = databaseNameFromHostname(hostname);
  let conn;
  try {
    conn = await getConnection();
    const dbList = await RethinkDB.dbList().run(conn);
    return dbList.includes(dbName);
  } finally {
    await releaseConnection(conn);
  }
}
