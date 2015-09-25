import JSONWebToken from 'jsonwebtoken';
import minimist from 'minimist';
import RethinkDB from 'rethinkdb';

import Config from '../server/Config';
import databaseNameFromHostname from '../server/databaseNameFromHostname';
import { getSecrets } from '../db/queries/simpleQueries';

async function createToken() {
  let conn;
  try {
    const argv = minimist(process.argv.slice(2), {
      alias: {
        admin: 'a',
        host: 'h',
        user: 'u',
      },
    });
    if (!argv.host) {
      console.log('Usage: npm run create-token -- -h HOST [ -a ] [ -u USER ]');
      return;
    }
    conn = await RethinkDB.connect({
      ...Config.get('RethinkDBPlugin'),
      db: databaseNameFromHostname(argv.host),
    });
    const secrets = await getSecrets(conn);
    const secret = secrets[0];
    if (!secret) {
      throw new Error('No secrets found');
    }
    const payload = {};
    if (argv.admin) {
      payload.isAdmin = true;
    }
    const options = {};
    if (argv.user) {
      options.subject = argv.user;
    }

    const token = JSONWebToken.sign(payload, secret, options);

    console.log(token);
  } catch (e) {
    console.error(e);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

createToken();
