import getDB from '../db/getDB';

export default async function hasApp(hostname) {
  const db = getDB(hostname);
  try {
    return await db.hasApp();
  } finally {
    db.close();
  }
}
