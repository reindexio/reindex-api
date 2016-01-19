import Promise from 'bluebird';
import Basic from 'hapi-auth-basic';

import { toReindexID } from '../graphQL/builtins/ReindexID';
import Config from './Config';
import hasApp from '../apps/hasApp';
import listApps from '../apps/listApps';
import createApp from '../apps/createApp';
import createToken from '../apps/createToken';
import createAppName from '../apps/createAppName';
import {
  hasIntercom,
  createIntercomUser,
  sendWelcomeEmail,
} from './IntercomClient';

async function listAppsHandler(request, reply) {
  const result = await listApps();
  return reply(result);
}

async function createAppHandler(request, reply) {
  const email = request.payload.email;
  const cluster = Config.get('database.defaultCluster');

  let hostname;
  let exists;
  do {
    hostname = createAppName();
    exists = await hasApp(hostname);
  } while (exists);

  const app = await createApp(hostname, cluster);
  const token = await createToken(hostname, { admin: true });

  if (hasIntercom()) {
    const user = await createIntercomUser(email, null, hostname);
    await sendWelcomeEmail(user.id, null, hostname, token);
  }

  reply({
    id: toReindexID(app.id),
    database: app.database,
    domains: app.domains.map((domain) => ({
      id: toReindexID(domain.id),
      hostname: domain.hostname,
    })),
    token,
  });
}

async function register(server, options, next) {
  server.register = Promise.promisify(server.register, server);
  await server.register(Basic);
  server.auth.strategy('password', 'basic', {
    validateFunc: (request, username, password, callback) => {
      const validKey = Config.get('app.key');
      if (validKey && username === validKey && password === '') {
        return callback(null, true, {});
      } else {
        return callback(null, false);
      }
    },
  });

  server.route({
    config: {
      auth: 'password',
    },
    path: '/app',
    method: 'POST',
    handler: createAppHandler,
    vhost: [
      'localhost',
      'admin.myreindex.com',
    ],
  });

  server.route({
    config: {
      auth: 'password',
    },
    path: '/app',
    method: 'GET',
    handler: listAppsHandler,
    vhost: [
      'localhost',
      'admin.myreindex.com',
    ],
  });

  next();
}

register.attributes = {
  name: 'AppPlugin',
};

const AppPlugin = { register };
export default AppPlugin;
