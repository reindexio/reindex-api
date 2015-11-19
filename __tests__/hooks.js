import { get } from 'lodash';
import { promisify } from 'bluebird';
import uuid from 'uuid';
import Hapi from 'hapi';

import createApp from '../apps/createApp';
import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import { getTypesByName, makeRunQuery } from '../test/testAppUtils';
import assert from '../test/assert';

describe('Hooks', () => {
  const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';
  const db = getDB(host);
  let runQuery;

  let requests = [];
  const server = createTestServer(requests);
  let typesByName;

  before(async () => {
    await createApp(host);
    await server.start();
    runQuery = (query, variables) => makeRunQuery(db)(query, variables, {
      newContext: true,
    });
    typesByName = await getTypesByName(db);
  });

  after(async () => {
    await server.stop();
    await db.close();
    await deleteApp(host);
  });

  it('Performs the hook', async () => {
    const requestMade = new Promise((resolve) => {
      server.once('tail', resolve);
    });
    const result = await runQuery(`
      mutation createHook($input: _CreateReindexHookInput!) {
        createReindexHook(input: $input) {
          id
        }
      }
    `, {
      input: {
        type: typesByName.User,
        trigger: 'afterCreate',
        url: 'http://localhost:8888',
        fragment: '{ id }',
        logLevel: 'all',
      },
    });

    const id = get(result, ['data', 'createReindexHook', 'id']);
    assert.isDefined(id, 'succesfully created hook');

    const user = await runQuery(`
      mutation User(
        $input: _CreateUserInput!
      ) {
        createUser(input: $input) {
          id,
        }
      }
    `, {
      input: {},
    });

    const userId = get(user, ['data', 'createUser', 'id']);

    await runQuery(`
      mutation update($input: _UpdateReindexHookInput!) {
        updateReindexHook(input: $input) {
          id,
        }
      }`, {
        input: {
          id,
          fragment: '{ id, invalidField }',
          logLevel: 'error',
        },
      },
    );

    await runQuery(`
      mutation User(
        $input: _CreateUserInput!
      ) {
        createUser(input: $input) {
          id,
        }
      }
    `, {
      input: {},
    });

    await requestMade;

    assert.deepEqual(requests, [
      {
        method: 'post',
        path: '/',
        body: {
          data: {
            hook: {
              id: userId,
            },
          },
        },
      },
    ]);

    requests = [];

    assert.deepEqual(await runQuery(`
      query getLog($id: ID!) {
        reindexHookById(id: $id) {
          log(orderBy: { field: "createdAt" }) {
            nodes {
              type,
              errors,
            }
          }
        }
      }
    `, {
      id,
    }), {
      data: {
        reindexHookById: {
          log: {
            nodes: [
              {
                type: 'success',
                errors: null,
              },
              {
                type: 'error',
                errors: [
                  'Error: Cannot query field "invalidField" on "_UserPayload".',
                ],
              },
            ],
          },
        },
      },
    });

    await runQuery(`
      mutation deleteHook($id: ID!) {
        deleteReindexHook(input: { id: $id }) {
          id,
        }
      }
    `, {
      id,
    });
  });
});

function createTestServer(requestStore) {
  const server = new Hapi.Server();
  server.connection({ host: 'localhost', port: 8888 });
  for (const method of ['stop', 'start']) {
    server[method] = promisify(server[method], server);
  }
  server.route({
    method: 'POST',
    path: '/',
    handler: (request, reply) => {
      requestStore.push({
        method: request.method,
        path: request.path,
        body: request.payload,
      });
      reply('ok');
    },
  });

  return server;
}
