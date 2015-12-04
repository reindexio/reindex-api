import Boom from 'boom';

import getDB from '../db/getDB';
import Monitoring from '../Monitoring';

async function onRequest(request, reply) {
  try {
    request.db = await getDB(request.info.hostname);
    reply.continue();
  } catch (error) {
    if (error.name === 'AppNotFound') {
      return reply(Boom.notFound());
    }
    Monitoring.noticeError(error);
    reply(error);
  }
}

async function close(request) {
  if (request.db) {
    await request.db.close();
  }
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
