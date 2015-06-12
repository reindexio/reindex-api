import Bassmaster from 'bassmaster';
import Hapi from 'hapi';
import Promise from 'bluebird';

import AppPlugin from './AppPlugin';
import Config from './Config';
import GraphQLHandler from './handlers/GraphQLHandler';
import JWTAuthenticationScheme from './JWTAuthenticationScheme';
import RethinkDBPlugin from './RethinkDBPlugin';

Config.load({}).validate();

export default async function createServer() {
  const server = new Hapi.Server();
  for (let method of ['register', 'start']) {
    server[method] = Promise.promisify(server[method], server);
  }
  server.connection(Config.get('connection'));

  await server.register(RethinkDBPlugin);
  await server.register(AppPlugin);
  await server.register(JWTAuthenticationScheme);
  server.auth.strategy('token', 'jwt');

  server.route(GraphQLHandler);

  await server.register(Bassmaster);

  return server;
}
