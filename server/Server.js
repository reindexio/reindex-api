import Hapi from 'hapi';
import Promise from 'bluebird';

import Config from './Config';
import GraphQLHandler from './handlers/GraphQLHandler';

Config.load({}).validate();

const Server = new Hapi.Server();
Server.connection(Config.get('connection'));
Server.route(GraphQLHandler);

for (let method of ['register', 'start']) {
  Server[method] = Promise.promisify(Server[method], Server);
}

export default Server;
