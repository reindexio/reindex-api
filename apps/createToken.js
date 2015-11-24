import getDB from '../db/getDB';

export default async function createToken(hostname, params) {
  const db = getDB(hostname);
  try {
    return await db.createToken(params);
  } finally {
    await db.close();
  }
}
