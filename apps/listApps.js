import RethinkDB from 'rethinkdb';

import Config from '../server/Config';
import hostnameFromDatabaseName from '../server/hostnameFromDatabaseName';

export default async function listApps() {
  let conn;
  try {
    conn = await RethinkDB.connect(Config.get('RethinkDBPlugin'));
    const dbList = await RethinkDB.dbList().run(conn);
    return dbList
      .filter((dbName) => /^reindex_/.test(dbName))
      .map(hostnameFromDatabaseName)
      .sort();
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
