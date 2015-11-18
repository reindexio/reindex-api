import getDB from '../db/getDB';

export default function createToken(hostname, params) {
  const db = getDB(hostname);
  try {
    return db.createToken(params);
  } finally {
    db.close();
  }
}
