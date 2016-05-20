import JSONWebToken from 'jsonwebtoken';
import Promise from 'bluebird';
import uuid from 'uuid';

import {
  makeRunQuery,
  createFixture,
  deleteFixture,
} from '../../test/testAppUtils';
import createApp from '../../apps/createApp';
import deleteApp from '../../apps/deleteApp';
import getDB from '../../db/getDB';
import createServer from '../createServer';
import Config from '../Config';
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

  it('fails gracefully if query is not provided', async function () {
    const response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${token}`,
        host: hostname,
      },
    });

    assert.strictEqual(response.statusCode, 400);
    assert.deepEqual(response.result, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Missing `query` in POST body.',
      validation: {
        keys: [],
        source: 'payload',
      },
    });
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

  it('returns correct errors', async function () {
    let response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query:
`{ userByI(id: "UmVpbmRleFR5cGU6NTZhOGE0OTE5MDg1Y2FiZjYwYTA5OTk1") { id } }`,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host: hostname,
      },
    });
    assert.strictEqual(response.statusCode, 200, 'syntax error');
    assert.deepEqual(JSON.parse(response.result), {
      errors: [
        {
          locations: [
            {
              column: 3,
              line: 1,
            },
          ],
          message: (
            'Cannot query field "userByI" on type "ReindexQueryRoot".'
          ),
        },
      ],
    }, 'syntax error');

    response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          {
            userById(id: "UmVpbmRleFR5cGU6NTZhOGE0OTE5MDg1Y2FiZjYwYTA5OTk1") {
              id
            }
          }
        `,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host: hostname,
      },
    });
    assert.strictEqual(response.statusCode, 200, 'user error');
    assert.deepEqual(JSON.parse(response.result), {
      data: {
        userById: null,
      },
      errors: [
        {
          locations: [
            {
              column: 13,
              line: 3,
            },
          ],
          message: 'id: Invalid ID for type User',
        },
      ],
    }, 'user error');

    response = await makeRequest({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          {
            error
          }
        `,
      },
      headers: {
        authorization: `Bearer ${token}`,
        host: hostname,
      },
    });
    assert.strictEqual(response.statusCode, 200, 'internal error');
    assert.deepEqual(JSON.parse(response.result), {
      data: {
        error: null,
      },
      errors: [
        {
          message: 'Internal Server Error',
        },
      ],
    }, 'internal error');
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

  describe('Rate limiting', () => {
    let newHostname = `test.${uuid.v4()}.example.com`;
    let newToken;

    before(async () => {
      const { secret } = await createApp(newHostname);
      newToken = JSONWebToken.sign({
        sub: null,
        isAdmin: true,
      }, secret);
      Config.set('RateLimiterPlugin.count', 1);
      Config.set('RateLimiterPlugin.excludedHosts', JSON.stringify([hostname]));
    });

    after(async () => {
      Config.set(
        'RateLimiterPlugin.count',
        Config.default('RateLimiterPlugin.count')
      );
      Config.set(
        'RateLimiterPlugin.excludedHosts',
        Config.default('RateLimiterPlugin.excludedHosts')
      );
      await deleteApp(newHostname);
    });

    it('should include rate limiting headers', async () => {
      const response = await makeRequest({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: testQuery,
        },
        headers: {
          authorization: `Bearer ${newToken}`,
          host: newHostname,
        },
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers['x-rate-limit-limit'], 1);
      assert.strictEqual(response.headers['x-rate-limit-remaining'], 0);
      assert.isDefined(response.headers['x-rate-limit-reset']);
    });

    it('should rate limit', async () => {
      const response = await makeRequest({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: testQuery,
        },
        headers: {
          authorization: `Bearer ${newToken}`,
          host: newHostname,
        },
      });
      assert.strictEqual(response.statusCode, 429);
      assert.strictEqual(response.headers['x-rate-limit-limit'], 1);
      assert.strictEqual(response.headers['x-rate-limit-remaining'], 0);
      assert.isDefined(response.headers['x-rate-limit-reset']);
    });

    it('excludes excluded hosts', async () => {
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
      assert.isUndefined(response.headers['x-rate-limit-limit']);
      assert.isUndefined(response.headers['x-rate-limit-remaining']);
      assert.isUndefined(response.headers['x-rate-limit-reset']);
    });
  });
});
