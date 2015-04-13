import {createLogger} from 'bunyan';

import Server from './Server';

const log = createLogger({name: 'server'});

export default function main() {
  Server.start((err) => {
    if (!err) {
      log.info('Server started at ' + Server.info.uri);
    }
  });
}
