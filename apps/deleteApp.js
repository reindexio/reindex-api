import RethinkDB from 'rethinkdb';

import { getConnection, releaseConnection } from '../db/dbConnections';
import databaseNameFromHostname from '../server/databaseNameFromHostname';

export default async function deleteApp(hostname) {
  const dbName = databaseNameFromHostname(hostname);
  let conn;
  try {
    conn = await getConnection();
    return await RethinkDB.dbDrop(dbName).run(conn);
  } finally {
    await releaseConnection(conn);
  }
}
