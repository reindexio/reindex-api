import RethinkDB from 'rethinkdb';
import uuid from 'uuid';

import assert from '../assert';
import Server from '../../server/Server';
import {createTestDatabase, deleteTestDatabase} from '../testDatabase';

function request(options) {
  return new Promise((resolve) => Server.inject(options, resolve));
}

describe('POST /graphql', () => {
  const dbName = 'testdb' + uuid.v4().replace(/-/g, '_');

  let conn;

  before(async function () {
    conn = await RethinkDB.connect();
    await createTestDatabase(conn, dbName);
  });

  after(async function () {
    await deleteTestDatabase(conn, dbName);
    await conn.close();
  });

  it('executes a GraphQL query', async function () {
    const response = await request({
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
        host: `${dbName}.example.com`,
      },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepEqual(response.result, {
      objects: {
        nodes: [
          {
            text: 'Test text',
          },
        ],
      },
    });
  });
});
