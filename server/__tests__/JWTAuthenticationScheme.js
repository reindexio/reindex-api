import Hapi from 'hapi';
import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import uuid from 'uuid';

import assert from '../../test/assert';
import createApp from '../../apps/createApp';
import deleteApp from '../../apps/deleteApp';
import getDB from '../../db/getDB';
import JWTAuthenticationScheme from '../JWTAuthenticationScheme';
import DBPlugin from '../DBPlugin';
import { createFixture, makeRunQuery } from '../../test/testAppUtils';
import { fromReindexID } from '../../graphQL/builtins/ReindexID';

describe('JWTAuthenticationScheme', () => {
  const host = `test.${uuid.v4()}.example.com`;
  let db;
  let server;
  let secret;
  let user;
  let validToken;

  const now = Math.floor(new Date() / 1000);
  const HOUR = 3600;

  before(async function () {
    ({ secret } = await createApp(host));
    db = await getDB(host);
    user = await createFixture(makeRunQuery(db), 'User', {}, 'id');

    server = new Hapi.Server();
    server.connection();
    const register = Promise.promisify(server.register, server);

    await register(DBPlugin);
    await register(JWTAuthenticationScheme);
    server.auth.strategy('token', 'jwt');
    server.route({
      method: 'POST',
      path: '/',
      handler(request, reply) {
        return reply('ok');
      },
      config: { auth: 'token' },
    });

    validToken = JSONWebToken.sign({
      sub: user.id,
      iat: now,
      exp: now + 24 * HOUR,
    }, secret);
  });

  after(async function () {
    await db.close();
    await deleteApp(host);
  });

  function makeRequest(headers) {
    const options = {
      method: 'POST',
      url: '/',
      payload: {},
      headers,
    };
    return new Promise((resolve) => server.inject(options, resolve));
  }

  it('returns a reply on successful authentication', async function() {
    const response = await makeRequest({
      authorization: `Bearer ${validToken}`,
      host,
    });
    assert.equal(response.statusCode, 200);
  });

  it('adds credentials to the request object', async function() {
    const response = await makeRequest({
      authorization: `Bearer ${validToken}`,
      host,
    });
    assert.deepEqual(response.request.auth.credentials, {
      hostname: host,
      isAdmin: false,
      userID: fromReindexID(user.id),
    });
  });

  it('uses anonymous credentials when header not given', async function() {
    const response = await makeRequest({ host });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.request.auth.credentials, {
      hostname: host,
      isAdmin: false,
      userID: null,
    });
  });

  it('returns an error for a malformed header', async function() {
    for (const authorization of [
      validToken,
      'Bearer',
      `Basic ${validToken}`,
    ]) {
      const response = await makeRequest({ authorization, host });
      assert.equal(response.statusCode, 401);
    }
  });

  it('returns an error for an expired token', async function () {
    const expiredToken = JSONWebToken.sign({
      sub: user.id,
      iat: now - 48 * HOUR,
      exp: now - 24 * HOUR,
    }, secret);
    const response = await makeRequest({
      authorization: `Bearer ${expiredToken}`,
      host,
    });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.result, {
      error: 'Unauthorized',
      message: 'Token expired',
      statusCode: 401,
    });
  });
});
