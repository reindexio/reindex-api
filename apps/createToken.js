import JSONWebToken from 'jsonwebtoken';

import { getConnection, releaseConnection } from '../db/dbConnections';
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
    conn = await getConnection(databaseNameFromHostname(hostname));
    secrets = await getSecrets(conn);
  } finally {
    await releaseConnection(conn);
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
