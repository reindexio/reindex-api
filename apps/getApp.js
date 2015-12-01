import getAdminDB from '../db/getAdminDB';

export default async function getApp(hostname) {
  const adminDB = getAdminDB(hostname);
  try {
    const domain = await adminDB.getByField('Domain', 'hostname', hostname);
    if (!domain) {
      return null;
    }
    const app = await adminDB.getByField('App', 'id', domain.app);
    return app;
  } finally {
    await adminDB.close();
  }
}
