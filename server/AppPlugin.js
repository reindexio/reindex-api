import AppStore from '../apps/AppStore';

async function onPreAuth(request, reply) {
  try {
    const conn = request.rethinkDBConnection;
    const app = await AppStore.getByHostname(conn, request.info.hostname);
    request.tenant = app;
    reply.continue();
  } catch (error) {
    reply(error);
  }
}

function register(server, options, next) {
  server.ext('onPreAuth', onPreAuth);
  next();
}

register.attributes = {
  name: 'AppPlugin',
};

const AppPlugin = { register };
export default AppPlugin;
