import Boom from 'boom';

import Monitoring from '../../Monitoring';

async function handler(request, reply) {
  Monitoring.setIgnoreTransaction(true);

  try {
    await request.db.getConnection();
  } catch (e) {
    Monitoring.noticeError(e);
    return reply(Boom.serverTimeout());
  }

  reply({
    status: 'ok',
  });
}

const StatusHandler = {
  handler,
  method: 'GET',
  path: '/status',
};

export default StatusHandler;
