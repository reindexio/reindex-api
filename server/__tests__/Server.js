import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import { randomString } from 'cryptiles';

import assert from '../../test/assert';
import createServer from '../createServer';
import databaseNameFromHostname from '../databaseNameFromHostname';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../../test/testDatabase';
import { toReindexID } from '../../graphQL/builtins/ReindexID';

describe('Server', () => {
  const host = randomString(10) + '.example.com';
  const db = databaseNameFromHostname(host);
  const randomUserID = toReindexID({ type: 'User', value: uuid.v4() });
  const randomSecret = 'secret';
  const token = JSONWebToken.sign({
    sub: randomUserID,
    isAdmin: true,
  }, randomSecret);
  const query = `query seacrh {
    getUser(id: "VXNlcjpiYmQxZGI5OC00YWM0LTQwYTctYjUxNC05NjgwNTljM2RiYWM") {
      id,
      handle,
    }
  }`;

  let conn;
  let server;

  function makeRequest(options) {
    return new Promise((resolve) => server.inject(options, resolve));
  }

  before(async function () {
    server = await createServer();
  });

  before(async function () {
    conn = await RethinkDB.connect({ db });
    await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await conn.close();
  });

  it('executes a GraphQL query', async function () {
    const response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host,
      },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.result), {
      data: {
        getUser: {
          id: 'VXNlcjpiYmQxZGI5OC00YWM0LTQwYTctYjUxNC05NjgwNTljM2RiYWM',
          handle: 'freiksenet',
        },
      },
    });
  });

  it('returns 404 for non-existent apps or reserved names', async function () {
    for (const invalidHost of ['nonexistent.example.com', 'rethinkdb.com']) {
      const response = await makeRequest({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
        headers: {
          authorization: `Bearer ${token}`,
          host: invalidHost,
        },
      });
      assert.strictEqual(response.statusCode, 404);
      assert.deepEqual(response.result, {
        error: 'Not Found',
        statusCode: 404,
      });
    }
  });
});
