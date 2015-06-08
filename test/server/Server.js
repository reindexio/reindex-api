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
    const token = JSONWebToken.sign({
      sub: randomUserID,
    }, randomSecret);
    const response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `nodes(type: Micropost) {
          objects(orderBy: createdAt, first: 1) {
            nodes {
              text
            }
          }
        }`,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host: `${dbName}.example.com`,
      },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepEqual(response.result, {
      nodes: {
        objects: {
          nodes: [
            {
              text: 'Test text',
            },
          ],
        },
      },
    });
  });
});
