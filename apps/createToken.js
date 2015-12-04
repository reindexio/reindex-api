import JSONWebToken from 'jsonwebtoken';

import getDB from '../db/getDB';

export default async function createToken(hostname, params) {
  const db = await getDB(hostname);
  try {
    const { admin, user } = {
      admin: false,
      user: null,
      ...params,
    };
    const secrets = await db.getSecrets();
    const secret = secrets[0];

    const payload = {
      isAdmin: admin,
    };

    const options = {};
    if (user) {
      options.subject = user;
    }

    return JSONWebToken.sign(payload, secret, options);
  } finally {
    await db.close();
  }
}
