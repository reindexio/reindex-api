import Hapi from 'hapi';

import Config from './Config';
import GraphQLHandler from './handlers/GraphQLHandler';

Config.load({}).validate();

const Server = new Hapi.Server();
Server.connection(Config.get('connection'));
Server.route(GraphQLHandler);

export default Server;
