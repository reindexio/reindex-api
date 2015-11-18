import getDB from '../db/getDB';

function makeRequestHandler() {
  return function openConnection(request, reply) {
    request.db = getDB(request.info.hostname);
    reply.continue();
  };
}

async function close(request) {
  await request.db.close();
}

function register(server, options, next) {
  server.ext('onRequest', makeRequestHandler());
  server.on('tail', close);
  next();
}

register.attributes = {
  name: 'RethinkDBPlugin',
};

const DBPlugin = { register };
export default DBPlugin;
