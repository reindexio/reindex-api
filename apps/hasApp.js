import RethinkDB from 'rethinkdb';

import Config from '../server/Config';
import databaseNameFromHostname from '../server/databaseNameFromHostname';

export default async function hasApp(hostname) {
  const dbName = databaseNameFromHostname(hostname);
  let conn;
  try {
    conn = await RethinkDB.connect(Config.get('RethinkDBPlugin'));
    const dbList = await RethinkDB.dbList().run(conn);
    return dbList.includes(dbName);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
