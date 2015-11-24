import getDB from '../db/getDB';

export default async function listApps() {
  const db = getDB();
  try {
    return await db.listApps();
  } finally {
    db.close();
  }
}
