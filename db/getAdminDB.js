import createDBClient from './createDBClient';
import getCluster from './getCluster';
import Config from '../server/Config';

export default function getAdminDB(originHostname) {
  const adminDatabaseName = Config.get('database.adminDatabase');
  const adminClusterName = Config.get('database.adminCluster');

  const cluster = getCluster(adminClusterName);
  return createDBClient(originHostname, adminDatabaseName, cluster);
}
