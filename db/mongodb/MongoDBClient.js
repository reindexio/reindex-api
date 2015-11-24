import { forEach, merge } from 'lodash';

import { MongoClient } from 'mongodb';
import databaseNameFromHostname from './databaseNameFromHostname';

import Config from '../../server/Config';
import * as appQueries from './queries/appQueries';
import * as simpleQueries from './queries/simpleQueries';
import * as connectionQueries from './queries/connectionQueries';
import * as mutationQueries from './queries/mutationQueries';
import * as migrationQueries from './queries/migrationQueries';

export default class MongoDBClient {
  constructor(hostname, {
    connectionString = Config.get('MongoDB.connectionString'),
  } = {}) {
    this.hostname = hostname;
    this.dbName = hostname && databaseNameFromHostname(this.hostname);
    this.connectionString = `${connectionString}/${this.dbName}`;
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

  async createApp() {
    return await appQueries.createApp(await this.getDB());
  }

  async deleteApp() {
    await appQueries.deleteApp(await this.getDB());
  }

  async hasApp() {
    return await appQueries.hasApp(await this.getDB(), this.dbName);
  }

  async listApps() {
    return await appQueries.listApps(await this.getDB());
  }

  async createToken(params) {
    return await appQueries.createToken(await this.getDB(), params);
  }
}

forEach(merge(
  {},
  simpleQueries,
  mutationQueries,
  connectionQueries,
  migrationQueries,
), (query, name) => {
  MongoDBClient.prototype[name] = async function(...args) {
    const db = await this.getDB();
    return query(db, ...args);
  };
});
