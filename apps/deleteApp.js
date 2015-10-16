import RethinkDB from 'rethinkdb';

import Config from '../server/Config';
import databaseNameFromHostname from '../server/databaseNameFromHostname';

export default async function deleteApp(hostname) {
  const dbName = databaseNameFromHostname(hostname);
  let conn;
  try {
    conn = await RethinkDB.connect(Config.get('RethinkDBPlugin'));
    return await RethinkDB.dbDrop(dbName).run(conn);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
