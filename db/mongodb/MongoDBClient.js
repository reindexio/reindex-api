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

const clusterConnections = {
};

export default class MongoDBClient {
  constructor(
    hostname,
    dbName,
    { connectionString },
  ) {
    this.hostname = hostname;
    this.dbName = dbName;
    if (!clusterConnections[connectionString]) {
      clusterConnections[connectionString] = MongoClient.connect(
        format(connectionString, '')
      );
    }
    this.pool = clusterConnections[connectionString];
  }

  hasSupport(feature) {
    if (feature === 'manyToMany') {
      return true;
    }
    return false;
  }

  async getDB() {
    if (!this.db) {
      const pool = await this.pool;
      this.db = pool.db(this.dbName);
    }
    return this.db;
  }

  close() {
    return Promise.resolve();
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
