import Bassmaster from 'bassmaster';
import Hapi from 'hapi';
import Promise from 'bluebird';

import Config from './Config';
import Good from 'good';
import GoodConsole from 'good-console';
import GraphQLHandler from './handlers/GraphQLHandler';
import GraphiQLHandler from './handlers/GraphiQLHandler';
import JWTAuthenticationScheme from './JWTAuthenticationScheme';
import RethinkDBPlugin from './RethinkDBPlugin';
import SocialLoginPlugin from './SocialLoginPlugin';

Config.load({}).validate();

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

  await server.register({
    register: RethinkDBPlugin,
    options: Config.get('RethinkDBPlugin'),
  });
  await server.register({
    register: SocialLoginPlugin,
    options: Config.get('SocialLoginPlugin'),
  });
  await server.register(JWTAuthenticationScheme);
  server.auth.strategy('token', 'jwt');

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
