import Config from '../server/Config';
import RethinkDBClient from './rethinkdb';

export const DATABASE_TYPES = [
  'rethinkdb',
];

export default function getDB(hostname, databaseType) {
  databaseType = databaseType || Config.get('Database.type');
  if (databaseType === 'rethinkdb') {
    return new RethinkDBClient(hostname);
  }
}
