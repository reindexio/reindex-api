import databaseNameFromHostname from './databaseNameFromHostname';
import { getConnection, releaseConnection } from '../db/dbConnections';


function makeRequestHandler() {
  return function openConnection(request, reply) {
    request.rethinkDBConnection = getConnection(
      databaseNameFromHostname(request.info.hostname),
    );
    reply.continue();
  };
}

async function close(request) {
  await releaseConnection(request.rethinkDBConnection);
}

function register(server, options, next) {
  server.ext('onRequest', makeRequestHandler());
  server.on('tail', close);
  next();
}

register.attributes = {
  name: 'RethinkDBPlugin',
};

const RethinkDBPlugin = { register };
export default RethinkDBPlugin;
