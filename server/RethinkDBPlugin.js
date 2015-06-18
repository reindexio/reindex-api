import RethinkDB from 'rethinkdb';

async function openConnection(request, reply) {
  try {
    request.rethinkDBConnection = await RethinkDB.connect();
    reply.continue();
  } catch (error) {
    reply(error);
  }
}

function closeConnection(request) {
  if (request.rethinkDBConnection) {
    request.rethinkDBConnection.close();
  }
}

function register(server, options, next) {
  server.ext('onRequest', openConnection);
  server.on('tail', closeConnection);
  next();
}

register.attributes = {
  name: 'RethinkDBPlugin',
};

const RethinkDBPlugin = { register };
export default RethinkDBPlugin;
