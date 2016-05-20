import Promise from 'bluebird';
import redis from 'redis';

import Config from '../server/Config';
import Monitoring from '../Monitoring';

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const CLIENTS = {};

export default function getRedisClient(name) {
  if (!CLIENTS[name]) {
    const client = redis.createClient(Config.get('redis.url'));
    client.once('error', (err) => {
      Monitoring.noticeError(err);
      CLIENTS[name] = null;
      client.quit();
    });
    CLIENTS[name] = client;
  }

  return CLIENTS[name];
}
