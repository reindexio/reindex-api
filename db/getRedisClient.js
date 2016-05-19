import Promise from 'bluebird';
import redis from 'redis';

import Config from '../server/Config';

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const CLIENTS = {};

export default function getRedisClient(name) {
  if (!CLIENTS[name]) {
    CLIENTS[name] = redis.createClient(Config.get('redis.url'));
  }

  return CLIENTS[name];
}
