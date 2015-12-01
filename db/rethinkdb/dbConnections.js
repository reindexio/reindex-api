import RethinkDB from 'rethinkdb';

export function getConnection(dbName, config) {
  return RethinkDB.connect({
    ...config,
    db: dbName,
  });
}

export async function releaseConnection(conn) {
  if (conn) {
    const resolvedConnection = await Promise.resolve(conn);
    await resolvedConnection.close();
  }
}
