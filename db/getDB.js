import createDBClient from './createDBClient';
import getAdminDB from './getAdminDB';
import getCluster from './getCluster';

function appNotFoundError(hostname) {
  const error = new Error(`App not found: ${hostname}`);
  error.name = 'AppNotFound';
  return error;
}

async function fetchApp(adminDB, hostname) {
  const domain = await adminDB.getByField('Domain', 'hostname', hostname);
  if (!domain) {
    throw appNotFoundError(hostname);
  }
  return await adminDB.getByID('App', domain.app);
}

const appsByHostname = {};

export default async function getDB(hostname) {
  let app = appsByHostname[hostname];
  if (!app) {
    let adminDB;
    try {
      adminDB = getAdminDB(hostname);
      app = await fetchApp(adminDB, hostname);
    } finally {
      if (adminDB) {
        await adminDB.close();
      }
    }
    appsByHostname[hostname] = app;
  }
  const cluster = getCluster(app.database.cluster);
  return createDBClient(hostname, app.database.name, cluster);
}
