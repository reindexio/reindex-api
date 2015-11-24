import getDB from '../db/getDB';

export default async function deleteApp(hostname) {
  const db = getDB(hostname);
  try {
    await db.deleteApp();
  } finally {
    await db.close();
  }
}
