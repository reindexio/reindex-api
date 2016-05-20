import { get } from 'lodash';
import { promisify, delay } from 'bluebird';
import uuid from 'uuid';
import Hapi from 'hapi';
import Boom from 'boom';

import createApp from '../apps/createApp';
import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import { getTypesByName, makeRunQuery } from '../test/testAppUtils';
import assert from '../test/assert';

describe('Hooks', () => {
  const host = `test.${uuid.v4()}.example.com`;
  let db;
  let runQuery;

  let requests = [];
  const server = createTestServer(requests);
  let typesByName;

  before(async () => {
    await createApp(host);
    await server.start();
    db = await getDB(host);
    runQuery = (query, variables) => makeRunQuery(db)(query, variables);
    typesByName = await getTypesByName(db);
  });

  after(async () => {
    await server.stop();
    await db.close();
    await deleteApp(host);
  });

  it('Performs the hook', async () => {
    const requestMade = new Promise((resolve) => {
      server.on('tail', () => {
        if (server.count && server.count > 0) {
          resolve();
        }
      });
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

    const user2 = await runQuery(`
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

    const userId2 = get(user2, ['data', 'createUser', 'id']);

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
      {
        method: 'post',
        path: '/',
        body: {
          data: {
            hook: {
              id: userId2,
            },
          },
        },
      },
    ]);

    requests = [];

    await delay(500);

    assert.deepEqual(await runQuery(`
      query getLog($id: ID!) {
        reindexHookById(id: $id) {
          log(orderBy: CREATED_AT_ASC) {
            nodes {
              type,
              errors,
              response {
                status,
                statusText,
                body
              }
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
                response: {
                  body: 'ok',
                  status: 200,
                  statusText: 'OK',
                },
              },
              {
                type: 'error',
                errors: null,
                response: {
                  body:
'{"statusCode":400,"error":"Bad Request","message":"IMMA ERROR"}',
                  status: 400,
                  statusText: 'Bad Request',
                },
              },
              {
                type: 'error',
                response: null,
                errors: [
                  'Error: Cannot query field "invalidField"' +
                  ' on type "_UserPayload".',
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
      if (server.count && server.count > 0) {
        server.count++;
        reply(Boom.badRequest('IMMA ERROR'));
      } else {
        server.count = 1;
        reply('ok');
      }
    },
  });

  return server;
}
