import RethinkDB from 'rethinkdb';

import databaseNameFromHostname from './databaseNameFromHostname';

function makeRequestHandler(options) {
  return function openConnection(request, reply) {
    request.rethinkDBConnection = RethinkDB.connect({
      ...options,
      db: databaseNameFromHostname(request.info.hostname),
    });
    reply.continue();
  };
}

async function closeConnection(request) {
  const conn = await request.rethinkDBConnection;
  conn.close();
}

function register(server, options, next) {
  server.ext('onRequest', makeRequestHandler(options));
  server.on('tail', closeConnection);
  next();
}

register.attributes = {
  name: 'RethinkDBPlugin',
};

const RethinkDBPlugin = { register };
export default RethinkDBPlugin;
