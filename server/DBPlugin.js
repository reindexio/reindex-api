import Boom from 'boom';
import getDB from '../db/getDB';

async function onRequest(request, reply) {
  request.getDB = async () => {
    try {
      request._db = await getDB(request.info.hostname);
      return request._db;
    } catch (error) {
      if (error && error.name === 'AppNotFound') {
        throw Boom.notFound();
      }
      throw Boom.wrap(error || new Error('Unknown error'));
    }
  };
  reply.continue();
}

async function close(request) {
  if (request._db) {
    await request._db.close();
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
