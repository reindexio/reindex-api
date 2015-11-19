import Bassmaster from 'bassmaster';
import Hapi from 'hapi';
import Promise from 'bluebird';
import HapiRequireHttpsPlugin from 'hapi-require-https';

import Config from './Config';
import Good from 'good';
import GoodConsole from 'good-console';
import StatusHandler from './handlers/StatusHandler';
import GraphQLHandler from './handlers/GraphQLHandler';
import GraphiQLHandler from './handlers/GraphiQLHandler';
import JWTAuthenticationScheme from './JWTAuthenticationScheme';
import DBPlugin from './DBPlugin';
import SocialLoginPlugin from './SocialLoginPlugin';

const loggingOptions = {
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

export default async function createServer() {
  const server = new Hapi.Server();
  for (const method of ['register', 'start']) {
    server[method] = Promise.promisify(server[method], server);
  }
  server.connection(Config.get('connection'));

  if (process.env.NODE_ENV === 'production') {
    await server.register(HapiRequireHttpsPlugin);
  }
  await server.register({
    register: DBPlugin,
  });
  await server.register({
    register: SocialLoginPlugin,
    options: Config.get('SocialLoginPlugin'),
  });
  await server.register(JWTAuthenticationScheme);
  server.auth.strategy('token', 'jwt');

  server.route(StatusHandler);
  server.route(GraphQLHandler);
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
