import { forEach, merge } from 'lodash';

import Metrics from '../../server/Metrics';
import { getConnection, releaseConnection } from './dbConnections';
import * as simpleQueries from './queries/simpleQueries';
import * as mutationQueries from './queries/mutationQueries';
import * as connectionQueries from './queries/connectionQueries';
import * as migrationQueries from './queries/migrationQueries';
import * as appQueries from './queries/appQueries';

export default class RethinkDBClient {
  constructor(hostname, dbName, cluster) {
    this.hostname = hostname;
    this.dbName = dbName;
    this.cluster = cluster;
  }

  async getConnection() {
    if (!this.conn) {
      this.conn = await getConnection(this.dbName, this.cluster);
    }
    return this.conn;
  }

  async close() {
    await releaseConnection(this.conn);
  }
}

forEach(merge(
  {},
  simpleQueries,
  mutationQueries,
  connectionQueries,
  migrationQueries,
), (query, name) => {
  RethinkDBClient.prototype[name] = async function(...args) {
    const conn = await this.getConnection();
    Metrics.increment('rethinkdb.queries', 1, this.hostname);
    return query(conn, ...args);
  };
});

forEach(appQueries, (query, name) => {
  RethinkDBClient.prototype[name] = async function(...args) {
    const conn = await this.getConnection();
    Metrics.increment('rethinkdb.queries', 1, this.hostname);
    return query(conn, this.dbName, ...args);
  };
});
