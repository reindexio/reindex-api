import JSONWebToken from 'jsonwebtoken';
import RethinkDB from 'rethinkdb';

import Config from '../server/Config';
import databaseNameFromHostname from '../server/databaseNameFromHostname';
import { getSecrets } from '../db/queries/simpleQueries';

export default async function createToken(hostname, params) {
  const { admin, user } = {
    admin: false,
    user: null,
    ...params,
  };
  let conn;
  let secrets;
  try {
    conn = await RethinkDB.connect({
      ...Config.get('RethinkDBPlugin'),
      db: databaseNameFromHostname(hostname),
    });
    secrets = await getSecrets(conn);
  } finally {
    if (conn) {
      conn.close();
    }
  }

  const secret = secrets[0];

  const payload = {
    isAdmin: admin,
  };

  const options = {};
  if (user) {
    options.subject = user;
  }

  return JSONWebToken.sign(payload, secret, options);
}
