import {createLogger} from 'bunyan';

import createServer from './createServer';

const log = createLogger({name: 'server'});

export default async function main() {
  let server;
  try {
    server = await createServer();
    await server.start();
  } catch (ex) {
    log.error(ex, 'Failed to start');
  }
  log.info('Server started at ' + server.info.uri);
}
