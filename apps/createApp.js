import getDB from '../db/getDB';

export default async function createApp(hostname) {
  const db = getDB(hostname);
  try {
    return {
      ...(await db.createApp()),
      hostname,
    };
  } finally {
    db.close();
  }
}
