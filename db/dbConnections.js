import RethinkDB from 'rethinkdb';
import Config from '../server/Config';

export function getConnection(db) {
  return RethinkDB.connect({
    ...Config.get('RethinkDBPlugin'),
    db,
  });
}

export async function releaseConnection(conn) {
  if (conn) {
    const resolvedConnection = await Promise.resolve(conn);
    await resolvedConnection.close();
  }
}
