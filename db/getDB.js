import Config from '../server/Config';
import DatabaseTypes from './DatabaseTypes';
import RethinkDBClient from './rethinkdb/RethinkDBClient';

export default function getDB(hostname, databaseType) {
  databaseType = databaseType || Config.get('Database.type');
  if (databaseType === DatabaseTypes.RethinkDB) {
    return new RethinkDBClient(hostname);
  }
}
