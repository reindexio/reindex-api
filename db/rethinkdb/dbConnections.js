import RethinkDB from 'rethinkdb';
import Config from '../../server/Config';

function getConfig(dbName) {
  const config = Config.get('RethinkDB2');
  if (config.databases.includes(dbName)) {
    return config;
  }
  return Config.get('RethinkDB');
}

export function getConnection(db) {
  return RethinkDB.connect({
    ...getConfig(db),
    db,
  });
}

export async function releaseConnection(conn) {
  if (conn) {
    const resolvedConnection = await Promise.resolve(conn);
    await resolvedConnection.close();
  }
}
