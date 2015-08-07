import JSONWebToken from 'jsonwebtoken';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';

import assert from '../assert';
import createServer from '../../server/createServer';
import {createTestDatabase, deleteTestDatabase} from '../testDatabase';


describe('Server', () => {
  const dbName = 'testdb' + uuid.v4().replace(/-/g, '_');
  const randomUserID = uuid.v4();
  const randomSecret = 'secret';
  const token = JSONWebToken.sign({
    sub: randomUserID,
  }, randomSecret);
  const query = `query seacrh {
    searchForMicropost(orderBy: "createdAt", first: 1) {
      nodes {
        text,
        createdAt
      }
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
    conn = await RethinkDB.connect();
    await createTestDatabase(conn, dbName);
  });

  after(async function () {
    await deleteTestDatabase(conn, dbName);
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
        host: `${dbName}.example.com`,
      },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.result), {
      data: {
        searchForMicropost: {
          nodes: [
            {
              text: 'Test text',
              createdAt: '2015-04-10T10:24:52.163Z',
            },
          ],
        },
      },
    });
  });

  it('returns 404 for non-existent apps or reserved names', async function () {
    for (const appName of ['nonexistent', 'rethinkdb']) {
      const response = await makeRequest({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
        headers: {
          authorization: `Bearer ${token}`,
          host: `${appName}.example.com`,
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
