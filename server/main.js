import Bassmaster from 'bassmaster';
import {createLogger} from 'bunyan';

import Server from './Server';

const log = createLogger({name: 'server'});

export default async function main() {
  try {
    await Server.register(Bassmaster);
    await Server.start();
  } catch (ex) {
    log.error(ex, 'Failed to start');
  }
  log.info('Server started at ' + Server.info.uri);
}
