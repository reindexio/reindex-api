import createDBClient from './createDBClient';
import Config from '../server/Config';

export default function getAdminDB(originHostname) {
  const adminDatabaseName = Config.get('database.adminDatabase');
  const settings = JSON.parse(Config.get('database.adminDatabaseSettings'));
  return createDBClient(originHostname, adminDatabaseName, settings);
}
