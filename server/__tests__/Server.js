import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import uuid from 'uuid';

import {
  makeRunQuery,
  createFixture,
  deleteFixture,
} from '../../test/testAppUtils';
import Config from '../Config';
import DatabaseTypes from '../../db/DatabaseTypes';
import createApp from '../../apps/createApp';
import deleteApp from '../../apps/deleteApp';
import getDB from '../../db/getDB';
import createServer from '../createServer';
import assert from '../../test/assert';
import { simulate } from '../SocialLoginPlugin';

describe('Server', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let server;
  let token;
  let userID;
  let runQuery;

  const testQuery = `{
    viewer {
      user {
        id
      }
    }
  }`;

  function makeRequest(options) {
    return new Promise((resolve) => server.inject(options, resolve));
  }

  before(async function () {
    server = await createServer({
      reporters: [],
    });
    const { secret } = await createApp(hostname);
    db = await getDB(hostname);
    runQuery = makeRunQuery(db);

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

  describe('Social Login', () => {
    let provider;
    const githubId = 'SOME-GITHUB-ID';

    before(async () => {
      simulate(() =>
        (request, reply) => {
          reply.continue({
            credentials: {
              provider: 'github',
              profile: {
                id: githubId,
                displayName: 'exampleUser',
                accessToken: 'EXAMPLE-TOKEN',
                raw: {},
              },
            },
          });
        }
      );

      provider = await createFixture(
        runQuery,
        'ReindexAuthenticationProvider',
        {
          type: 'github',
          clientId: 'sample-id',
          clientSecret: 'sample-secret',
          isEnabled: true,
        },
        `id`
      );
    });

    after(async () => {
      simulate(false);
      await deleteFixture(
        runQuery,
        'ReindexAuthenticationProvider',
        provider.id,
      );
    });

    it('should fail for non-existant provider', async () => {
      const result = await makeRequest({
        method: 'GET',
        url: '/auth/google',
        headers: {
          host: hostname,
        },
      });

      assert.match(result.payload, /PROVIDER_DISABLED/);
    });

    it('should create new user once for same credential', async () => {
      await makeRequest({
        method: 'GET',
        url: '/auth/github',
        headers: {
          host: hostname,
        },
      });

      let userResult = await runQuery(`
        query($id: String!){
          userByCredentialsGithubId(id: $id) {
            id
          }
        }
      `, {
        id: githubId,
      });

      assert.deepProperty(userResult, 'data.userByCredentialsGithubId.id');

      const userId = userResult.data.userByCredentialsGithubId.id;

      await makeRequest({
        method: 'GET',
        url: '/auth/github',
        headers: {
          host: hostname,
        },
      });

      userResult = await runQuery(`
        query($id: String!){
          userByCredentialsGithubId(id: $id) {
            id
          }
        }
      `, {
        id: githubId,
      });

      assert.deepEqual(userId, userResult.data.userByCredentialsGithubId.id);
    });
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
