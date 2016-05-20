import Promise from 'bluebird';
import uuid from 'uuid';

import Monitoring from '../Monitoring';
import getRedisClient from '../db/getRedisClient';

export default class RedisCache {
  constructor(clientName, refresher, {
    retryTimeout = 100,
    lockTimeout = 2500,
    cacheTimeout = 10000,
  } = {}) {
    this.clientName = clientName;
    this.refresher = refresher;
    this.id = uuid.v4();
    this.retryTimeout = retryTimeout;
    this.lockTimeout = lockTimeout;
    this.cacheTimeout = cacheTimeout;
  }

  async get(key) {
    const client = getRedisClient(this.clientName);
    try {
      if (client && client.connected) {
        const result = await client.getAsync(key);
        if (!result) {
          const wait = await client.existsAsync(`reindex.lock.${key}`);
          if (wait) {
            return Promise
              .delay(this.retryTimeout)
              .then(() => this.get(key));
          } else {
            return this._fetch(client, key);
          }
        }
        return JSON.parse(result);
      }
    } catch (e) {
      Monitoring.noticeError(e);
    }

    return this.refresher(key);
  }

  async _fetch(client, key) {
    const lock = await client.setAsync(
      key, this.id, 'PX', this.lockTimeout, 'NX'
    );
    if (lock === 'OK') {
      const result = await this.refresher(key);
      await client.setAsync(
        key, JSON.stringify(result), 'PX', this.cacheTimeout
      );
      await client.evalAsync(DELIFEQUAL_SCRIPT, 1, key, this.id);
      return result;
    } else {
      return this.get(key);
    }
  }
}

const DELIFEQUAL_SCRIPT = (
  'if redis.call(\'GET\', KEYS[1]) == ARGV[1] then\n' +
  '  return redis.call(\'DEL\', KEYS[1])\n' +
  'end\n' +
  'return 0'
);
