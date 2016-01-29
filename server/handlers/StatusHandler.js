import Boom from 'boom';

import createDBClient from '../../db/createDBClient';
import DatabaseTypes from '../../db/DatabaseTypes';
import Config from '../Config';

async function handler(request, reply) {
  const clusters = JSON.parse(Config.get('database.clusters'));
  try {
    for (const clusterName in clusters) {
      const cluster = clusters[clusterName];
      if (cluster.type === DatabaseTypes.MongoDB) {
        const client = createDBClient(request.info.hostname, 'admin', cluster);
        const db = (await client.getDB()).admin();
        const result = await db.serverStatus();
        if (!result.ok) {
          throw new Error(`${clusterName} is not okay.`);
        }
      }
    }
  } catch (e) {
    return reply(Boom.serverTimeout());
  }

  return reply({
    status: 'ok',
  });
}

const StatusHandler = {
  handler,
  method: 'GET',
  path: '/status',
};

export default StatusHandler;
