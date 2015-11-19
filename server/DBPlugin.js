import getDB from '../db/getDB';

function onRequest(request, reply) {
  request.db = getDB(request.info.hostname);
  reply.continue();
}

async function close(request) {
  await request.db.close();
}

function register(server, options, next) {
  server.ext('onRequest', onRequest);
  server.on('tail', close);
  next();
}

register.attributes = {
  name: 'DBPlugin',
};

const DBPlugin = { register };
export default DBPlugin;
