import Hapi from 'hapi';
import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import RethinkDB from 'rethinkdb';
import { randomString } from 'cryptiles';

import assert from '../../test/assert';
import databaseNameFromHostname from '../databaseNameFromHostname';
import JWTAuthenticationScheme from '../JWTAuthenticationScheme';
import RethinkDBPlugin from '../RethinkDBPlugin';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../../test/testDatabase';
import { toReindexID } from '../../graphQL/builtins/ReindexID';

describe('JWTAuthenticationScheme', () => {
  const host = randomString(10) + '.example.com';
  const db = databaseNameFromHostname(host);
  const secret = 'secret';
  let conn;
  let server;

  before(async function () {
    conn = await RethinkDB.connect({ db });
    await createTestDatabase(conn, db);

    server = new Hapi.Server();
    server.connection();
    const register = Promise.promisify(server.register, server);

    await register(RethinkDBPlugin);
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
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await conn.close();
  });

  const userID = '3c00d00d-e7d9-4cde-899f-e9c5d6400d87';
  const now = Math.floor(new Date() / 1000);
  const HOUR = 3600;

  const validToken = JSONWebToken.sign({
    sub: toReindexID({ type: 'User', value: userID }),
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
      isAdmin: false,
      userID,
    });
  });

  it('uses anonymous credentials when header not given', async function() {
    const response = await makeRequest({});
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.request.auth.credentials, {
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
      const response = await makeRequest({ authorization });
      assert.equal(response.statusCode, 401);
    }
  });

  it('returns an error for an expired token', async function () {
    const expiredToken = JSONWebToken.sign({
      sub: toReindexID({ type: 'User', value: userID }),
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
