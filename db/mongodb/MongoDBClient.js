import { format } from 'util';

import { forEach, merge } from 'lodash';
import { MongoClient } from 'mongodb';

import Metrics from '../../server/Metrics';
import * as appQueries from './queries/appQueries';
import * as simpleQueries from './queries/simpleQueries';
import * as connectionQueries from './queries/connectionQueries';
import * as mutationQueries from './queries/mutationQueries';
import * as migrationQueries from './queries/migrationQueries';
import { isValidID } from './queries/queryUtils';

export default class MongoDBClient {
  constructor(
    hostname,
    dbName,
    { connectionString },
  ) {
    this.hostname = hostname;
    this.dbName = dbName;
    this.connectionString = format(connectionString, this.dbName);
  }

  getDB() {
    if (!this.db) {
      this.db = MongoClient.connect(this.connectionString);
    }
    return this.db;
  }

  async close() {
    if (this.db) {
      const db = await this.db;
      await db.close();
    }
  }

  isValidID(type, id) {
    return isValidID(type, id);
  }
}

forEach(merge(
  {},
  appQueries,
  simpleQueries,
  mutationQueries,
  connectionQueries,
  migrationQueries,
), (query, name) => {
  MongoDBClient.prototype[name] = async function(...args) {
    const db = await this.getDB();
    Metrics.increment('mongodb.queries', 1, this.hostname);
    return query(db, ...args);
  };
});
