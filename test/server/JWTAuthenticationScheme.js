import Hapi from 'hapi';
import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import uuid from 'uuid';

import assert from '../assert';
import JWTAuthenticationScheme from '../../server/JWTAuthenticationScheme';

describe('JWTAuthenticationScheme', () => {
  const dbName = 'testdb' + uuid.v4().replace(/-/g, '_');

  let conn;
  let Server;

  before(async function () {
    Server = new Hapi.Server();
    Server.connection();
    const register = Promise.promisify(Server.register, Server);
    await register(JWTAuthenticationScheme);
    Server.auth.strategy('token', 'jwt');
    Server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        return reply('ok');
      },
      config: { auth: 'token' },
    });
  });

  const secret = 'secret';
  const userID = '3c00d00d-e7d9-4cde-899f-e9c5d6400d87';
  const now = Math.floor(new Date() / 1000);
  const HOUR = 3600;

  const validToken = JSONWebToken.sign({
    sub: userID,
    iat: now,
    exp: now + 24 * HOUR,
  }, secret);

  function makeRequest(headers) {
    const options = {
      method: 'POST',
      url: '/',
      payload: {},
      headers,
    };
    return new Promise((resolve) => Server.inject(options, resolve));
  }

  it('returns a reply on successful authentication', async function() {
    const response = await makeRequest({
      authorization: `Bearer ${validToken}`,
    });
    assert.strictEqual(response.statusCode, 200);
  });

  it('adds credentials to the request object', async function() {
    const response = await makeRequest({
      authorization: `Bearer ${validToken}`,
    });
    assert.deepEqual(response.request.auth.credentials, {
      userID,
      isAdmin: false,
    });
  });


  it('returns an error on missing or malformed header', async function() {
    for (let authorization of [
      null,
      '',
      validToken,
      'Bearer',
      `Basic ${validToken}`,
    ]) {
      const response = await makeRequest({ authorization });
      assert.strictEqual(response.statusCode, 401);
    }
  });

  it('returns an error on expired token', async function () {
    const expiredToken = JSONWebToken.sign({
      sub: userID,
      iat: now - 48 * HOUR,
      exp: now - 24 * HOUR,
    }, secret);
    const response = await makeRequest({
      authorization: `Bearer ${expiredToken}`,
    });
    assert.strictEqual(response.statusCode, 401);
    assert.deepEqual(response.result, {
      error: 'Unauthorized',
      message: 'Token expired',
      statusCode: 401,
    });
  });
});
