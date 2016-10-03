import Boom from 'boom';
import Limiter from 'ratelimiter';
import Promise from 'bluebird';

Promise.promisifyAll(Limiter.prototype);

import Config from '../server/Config';
import Metrics from '../server/Metrics';
import getRedisClient from '../db/getRedisClient';

async function onPreAuth(request, reply) {
  const client = getRedisClient('RateLimiterPlugin');
  if (rateLimitEnabled(request) && client && client.connected) {
    const limiter = new Limiter({
      id: request.info.hostname,
      db: getRedisClient('rateLimiter'),
      max: Config.get('RateLimiterPlugin.count'),
      duration: Config.get('RateLimiterPlugin.duration'),
    });

    const rateLimit = await limiter.getAsync();
    request.plugins.RateLimiterPlugin = {};
    request.plugins.RateLimiterPlugin.limit = rateLimit.total;
    request.plugins.RateLimiterPlugin.remaining = rateLimit.remaining - 1;
    request.plugins.RateLimiterPlugin.reset = rateLimit.reset;

    if (rateLimit.remaining <= 0) {
      const error = Boom.tooManyRequests('Rate limit exceeded');
      error.output.headers['X-Rate-Limit-Limit'] = rateLimit.total;
      error.output.headers['X-Rate-Limit-Remaining'] = rateLimit.remaining;
      error.output.headers['X-Rate-Limit-Reset'] = rateLimit.reset;
      error.reformat();
      Metrics.increment('reindex.rateLimited', 1, request.info.hostname);
      return reply(error);
    }
  }
  reply.continue();
}

function onPostHandler(request, reply) {
  if (rateLimitEnabled(request) && 'RateLimiterPlugin' in request.plugins) {
    const rateLimit = request.plugins.RateLimiterPlugin;
    const response = request.response;
    if (!response.isBoom) {
      response.headers['X-Rate-Limit-Limit'] = rateLimit.limit;
      response.headers['X-Rate-Limit-Remaining'] = rateLimit.remaining;
      response.headers['X-Rate-Limit-Reset'] = rateLimit.reset;
    }
  }

  reply.continue();
}

function rateLimitEnabled(request) {
  const excludedHosts = JSON.parse(
    Config.get('RateLimiterPlugin.excludedHosts')
  );
  return (
    request.route.settings.plugins.RateLimiterPlugin &&
    request.route.settings.plugins.RateLimiterPlugin.enabled &&
    !excludedHosts.includes(request.info.hostname)
  );
}

function register(server, options, next) {
  server.ext('onPreAuth', onPreAuth);
  server.ext('onPostHandler', onPostHandler);
  next();
}

register.attributes = {
  name: 'RateLimiterPlugin',
};

const RateLimiterPlugin = {
  register,
};
export default RateLimiterPlugin;
