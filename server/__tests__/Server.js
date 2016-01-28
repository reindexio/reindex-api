import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import uuid from 'uuid';
import { graphql } from 'graphql';

import Config from '../Config';
import DatabaseTypes from '../../db/DatabaseTypes';
import getGraphQLContext from '../../graphQL/getGraphQLContext';
import createApp from '../../apps/createApp';
import deleteApp from '../../apps/deleteApp';
import getDB from '../../db/getDB';
import createServer from '../createServer';
import assert from '../../test/assert';

describe('Server', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let server;
  let token;
  let userID;

  const testQuery = `{
    viewer {
      user {
        id
      }
    }
  }`;

  async function runQuery(query, variables, credentials = {
    isAdmin: true,
    userID: null,
  }) {
    const context = getGraphQLContext(
      db,
      await db.getMetadata(),
      {
        credentials,
      }
    );
    return await graphql(context.schema, query, context, variables);
  }

  function makeRequest(options) {
    return new Promise((resolve) => server.inject(options, resolve));
  }

  before(async function () {
    server = await createServer({
      reporters: [],
    });
    const { secret } = await createApp(hostname);
    db = await getDB(hostname);

    const userData = await runQuery(`
      mutation user {
        createUser(input: {}) {
          id
        }
      }
    `);

    userID = userData.data.createUser.id;

    token = JSONWebToken.sign({
      sub: userID,
      isAdmin: true,
    }, secret);
  });

  after(async function () {
    await db.close();
    await deleteApp(hostname);
  });

  it('executes a GraphQL query', async function () {
    const response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: testQuery,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host: hostname,
      },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.result), {
      data: {
        viewer: {
          user: {
            id: userID,
          },
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
          query: testQuery,
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

  describe('Broken database connection', () => {
    before(async () => {
      Config.set('database.clusters', JSON.stringify({
        mongodb: {
          type: DatabaseTypes.MongoDB,
          connectionString: 'mongodb://localhost:65355/',
        },
      }));
      Config.validate();
    });

    after(() => {
      Config.set('database.clusters', Config.default('database.clusters'));
      Config.validate();
    });

    it('returns 500 when databases are not available', async function () {
      const response = await makeRequest({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: testQuery,
        },
        headers: {
          authorization: `Bearer ${token}`,
          host: hostname,
        },
      });
      assert.strictEqual(response.statusCode, 500);
    });

    it('status page returns service not available', async function () {
      const response = await makeRequest({
        method: 'GET',
        url: '/status',
        headers: {
          host: hostname,
        },
      });
      assert.strictEqual(response.statusCode, 503);
    });
  });
});
