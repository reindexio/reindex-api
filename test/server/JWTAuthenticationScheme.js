import Hapi from 'hapi';
import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import {List} from 'immutable';

import App from '../../apps/App';
import assert from '../assert';
import JWTAuthenticationScheme from '../../server/JWTAuthenticationScheme';


describe('JWTAuthenticationScheme', () => {
  const secret = 'secret';
  let conn;
  let server;

  before(async function () {
    server = new Hapi.Server();
    server.connection();
    const register = Promise.promisify(server.register, server);

    await register(JWTAuthenticationScheme);
    server.ext('onPreAuth', (request, reply) => {
      request.tenant = new App({
        secrets: List.of(secret),
      });
      reply.continue();
    });
    server.auth.strategy('token', 'jwt');
    server.route({
      method: 'POST',
      path: '/',
      handler(request, reply) {
        return reply('ok');
      },
      config: { auth: 'token' },
    });
  });

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
    return new Promise((resolve) => server.inject(options, resolve));
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
    for (const authorization of [
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
