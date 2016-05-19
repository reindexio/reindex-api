import Boom from 'boom';
import Limiter from 'ratelimiter';
import Promise from 'bluebird';

Promise.promisifyAll(Limiter.prototype);

import getRedisClient from '../db/getRedisClient';

// 250 requests per minute
const RATE_LIMIT_COUNT = 200;
const RATE_LIMIT_DURATION = 60 * 1000;

async function onPreAuth(request, reply) {
  if (rateLimitEnabled(request)) {
    const limiter = new Limiter({
      id: request.info.hostname,
      db: getRedisClient('rateLimiter'),
      max: RATE_LIMIT_COUNT,
      duration: RATE_LIMIT_DURATION,
    });

    const rateLimit = await limiter.getAsync();
    request.plugins['reindex-ratelimit'] = {};
    request.plugins['reindex-ratelimit'].limit = rateLimit.total;
    request.plugins['reindex-ratelimit'].remaining = rateLimit.remaining - 1;
    request.plugins['reindex-ratelimit'].reset = rateLimit.reset;

    if (rateLimit.remaining <= 0) {
      const error = Boom.tooManyRequests('Rate limit exceeded');
      error.output.headers['X-Rate-Limit-Limit'] = rateLimit.total;
      error.output.headers['X-Rate-Limit-Remaining'] = rateLimit.remaining - 1;
      error.output.headers['X-Rate-Limit-Reset'] = rateLimit.reset;
      error.reformat();
      return reply(error);
    }
  }
  reply.continue();
}

function onPostHandler(request, reply) {
  if (rateLimitEnabled(request) && 'reindex-ratelimit' in request.plugins) {
    const rateLimit = request.plugins['reindex-ratelimit'];
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
  return (
    request.route.settings.plugins.RateLimitPlugin &&
    request.route.settings.plugins.RateLimitPlugin.enabled
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
