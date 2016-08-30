import Bassmaster from 'bassmaster';
import Hapi from 'hapi';
import Inert from 'inert';
import Promise from 'bluebird';
import HapiRequireHttpsPlugin from 'hapi-require-https';
import Good from 'good';
import GoodConsole from 'good-console';

import Monitoring from '../Monitoring';
import Config from './Config';
import GraphiQLHandler from './handlers/GraphiQLHandler';
import AppPlugin from './AppPlugin';
import JWTAuthenticationScheme from './JWTAuthenticationScheme';
import DBPlugin from './DBPlugin';
import SocialLoginPlugin from './SocialLoginPlugin';
import createReindex from '../graphQL/createReindex';

const DEFAULT_LOGGING_OPTIONS = {
  reporters: [
    {
      reporter: GoodConsole,
      events: {
        error: '*',
        log: '*',
      },
    },
  ],
};

export default async function createServer(
  loggingOptions = DEFAULT_LOGGING_OPTIONS
) {
  const server = new Hapi.Server();
  for (const method of ['register', 'start', 'stop']) {
    server[method] = Promise.promisify(server[method], server);
  }
  server.connection(Config.get('connection'));

  if (process.env.NODE_ENV === 'production') {
    await server.register(HapiRequireHttpsPlugin);
  }
  await server.register(Inert);
  await server.register(DBPlugin);
  await server.register({
    register: SocialLoginPlugin,
    options: Config.get('SocialLoginPlugin'),
  });
  await server.register(JWTAuthenticationScheme);
  server.auth.strategy('token', 'jwt');

  await server.register(AppPlugin);

  server.on('request-error', (request, e) => {
    Monitoring.noticeError(e, {
      request,
    });
  });

  const reindex = createReindex();
  server.route({
    config: {
      auth: 'token',
      validate: {
        payload: (value, options, next) => {
          if (!value || !value.query) {
            return next(new Error('Missing `query` in POST body.'));
          } else {
            return next(null, value);
          }
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await reindex.processRequest(request);
        return reply(JSON.stringify(result)).type('application/json');
      } catch (error) {
        return reply(error);
      }
    },
    method: 'POST',
    path: '/graphql',
  });

  server.route(GraphiQLHandler);
  server.route({
    handler: {
      directory: {
        path: 'static',
      },
    },
    method: 'GET',
    path: '/static/{param*}',
  });

  await server.register(Bassmaster);
  await server.register({
    register: Good,
    options: loggingOptions,
  });

  return server;
}
