import getAdminDB from '../db/getAdminDB';
import getDB from '../db/getDB';

export default async function deleteApp(hostname) {
  const adminDB = getAdminDB(hostname);
  let db;
  try {
    db = await getDB(hostname);
    const domain = await adminDB.getByField('Domain', 'hostname', hostname);
    if (domain == null) {
      throw new Error('App not found');
    }
    await adminDB.deleteQuery('Domain', domain.id);
    await adminDB.deleteQuery('App', domain.app);
    await db.deleteDatabaseForApp();
  } finally {
    await adminDB.close();
    if (db) {
      await db.close();
    }
  }
}
