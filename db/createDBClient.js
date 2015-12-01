import DatabaseTypes from './DatabaseTypes';
import MongoDBClient from './mongodb/MongoDBClient';
import RethinkDBClient from './rethinkdb/RethinkDBClient';

export default function createDBClient(hostname, dbName, cluster) {
  switch (cluster.type) {
    case DatabaseTypes.MongoDB:
      return new MongoDBClient(hostname, dbName, cluster);
    case DatabaseTypes.RethinkDB:
      return new RethinkDBClient(hostname, dbName, cluster);
    default:
      throw new Error(`Invalid database type: ${cluster.type}`);
  }
}
