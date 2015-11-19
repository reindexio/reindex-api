import getDB from '../db/getDB';

export default async function listApps(hostname) {
  const db = getDB(hostname);
  try {
    return await db.listApps();
  } finally {
    db.close();
  }
}
