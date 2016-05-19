import { parse as parseQs, stringify as stringifyQs } from 'qs';
import DataLoader from 'dataloader';
import { forEach, merge } from 'lodash';
import { MongoClient } from 'mongodb';

import { UserError } from '../../graphQL/UserError';
import Metrics from '../../server/Metrics';
import * as appQueries from './queries/appQueries';
import * as simpleQueries from './queries/simpleQueries';
import * as connectionQueries from './queries/connectionQueries';
import * as mutationQueries from './queries/mutationQueries';
import * as migrationQueries from './queries/migrationQueries';
import { isValidID } from './queries/queryUtils';

const clusterConnections = {
};

const MONGO_EVENTS = ['error', 'timeout', 'reconnect'];

export default class MongoDBClient {
  constructor(
    hostname,
    dbName,
    {
      connectionString,
    },
  ) {
    this.hostname = hostname;
    this.dbName = dbName;

    let passedOptions = {};
    const [queryLessConnectionString, qs] = connectionString.split('?');
    if (qs) {
      passedOptions = parseQs(qs);
    }

    const options = {
      w: 1,
      journal: true,
      ...passedOptions,
    };

    const fullQs = stringifyQs(options);

    if (!clusterConnections[connectionString]) {
      Metrics.increment('mongodb.connectCount', 1, this.hostname);
      clusterConnections[connectionString] = MongoClient.connect(
        `${queryLessConnectionString}?${fullQs}`
      ).then((db) => {
        const callbacks = {};
        for (const eventType of MONGO_EVENTS) {
          callbacks[eventType] = () => {
            Metrics.increment(`mongodb.${eventType}Count`, 1, this.hostname);
          };
          db.on(eventType, callbacks[eventType]);
        }
        db.once('destroy', () => {
          Metrics.increment('mongodb.destroyCount', 1, this.hostname);
          for (const eventType of MONGO_EVENTS) {
            db.removeListener(eventType, callbacks[eventType]);
          }
          clusterConnections[connectionString] = null;
        });
        return db;
      });
    }
    this.pool = clusterConnections[connectionString];
    this.connectionString = connectionString;

    this.stats = {
      count: 0,
      totalTime: 0,
      byQuery: {},
    };

    this.cache = {
      idLoader: {},
    };
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

  clearCache() {
    for (const key in this.cache.idLoader) {
      this.cache.idLoader[key].clearAll();
    }
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
    const db = await Metrics.timing(
      'mongodb.connectionTime',
      this.hostname,
      () => this.getDB(),
    );
    const result = await Metrics.timing(
      `mongodb.query.${name}`,
      this.hostname,
      () => query(db, ...args),
      (time) => {
        this.stats = {
          totalTime: this.stats.totalTime + time,
          count: this.stats.count + 1,
          byQuery: this.stats.byQuery,
        };
        const currentStats = this.stats.byQuery[name] || {
          count: 0,
          totalTime: 0,
        };
        currentStats.count = currentStats.count + 1;
        currentStats.totalTime = currentStats.totalTime + time;
        this.stats.byQuery[name] = currentStats;
      }
    );
    return result;
  };
});

MongoDBClient.prototype.getByID = function(type, id) {
  if (!this.isValidID(type, id)) {
    throw new UserError(`Invalid ID for type ${type}`);
  }
  if (!this.cache.idLoader[type]) {
    this.cache.idLoader[type] = new DataLoader(
      async (ids) => this.getByIDBatch(type, ids)
    );
  }
  return this.cache.idLoader[type].load(id.value);
};
