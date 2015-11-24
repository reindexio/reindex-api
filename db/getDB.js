import Config from '../server/Config';
import DatabaseTypes from './DatabaseTypes';
import RethinkDBClient from './rethinkdb/RethinkDBClient';
import MongoDBClient from './mongodb/MongoDBClient';

export default function getDB(hostname, databaseType) {
  databaseType = databaseType || Config.get('Database.type');
  if (databaseType === DatabaseTypes.RethinkDB) {
    return new RethinkDBClient(hostname);
  } else if (databaseType === DatabaseTypes.MongoDB) {
    return new MongoDBClient(hostname);
  }
}
