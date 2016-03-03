import DatabaseTypes from './DatabaseTypes';
import MongoDBClient from './mongodb/MongoDBClient';
import RethinkDBClient from './rethinkdb/RethinkDBClient';

export default function createDBClient(hostname, dbName, settings) {
  switch (settings.type) {
    case DatabaseTypes.MongoDB:
    case DatabaseTypes.MongoDBReplicaSet:
      return new MongoDBClient(hostname, dbName, settings);
    case DatabaseTypes.RethinkDB:
      return new RethinkDBClient(hostname, dbName, settings);
    default:
      throw new Error(`Invalid database type: ${settings.type}`);
  }
}
