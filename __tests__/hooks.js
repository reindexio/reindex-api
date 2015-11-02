import { chain, get } from 'lodash';
import { promisify } from 'bluebird';
import uuid from 'uuid';
import Hapi from 'hapi';
import RethinkDB from 'rethinkdb';
import { graphql } from 'graphql';

import { getConnection, releaseConnection } from '../db/dbConnections';
import { TYPE_TABLE } from '../db/DBTableNames';
import { getMetadata } from '../db/queries/simpleQueries';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import { toReindexID } from '../graphQL/builtins/ReindexID';
import assert from '../test/assert';
import createApp from '../apps/createApp';
import deleteApp from '../apps/deleteApp';

describe('Hooks', () => {
  const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';
  let dbName;
  let conn;

  let requests = [];
  const server = createTestServer(requests);

  let typesByName;

  function getTypeID(type) {
    return toReindexID({
      type: 'ReindexType',
      value: typesByName[type],
    });
  }

  async function runQuery(query, variables, credentials = {
    isAdmin: true,
    userID: null,
  }) {
    const context = getGraphQLContext(conn, await getMetadata(conn), {
      credentials,
    });
    return await graphql(context.schema, query, context, variables);
  }


  before(async () => {
    dbName = (await createApp(host)).dbName;
    conn = await getConnection(dbName);
    await server.start();

    const types = await RethinkDB
      .db(dbName)
      .table(TYPE_TABLE)
      .coerceTo('array')
      .run(conn);
    typesByName = chain(types)
      .groupBy((type) => type.name)
      .mapValues((value) => value[0].id)
      .value();
  });

  after(async () => {
    await deleteApp(host);
    await releaseConnection(conn);
    await server.stop();
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
        type: getTypeID('User'),
        trigger: 'afterCreate',
        url: 'http://localhost:8888',
        fragment: '{ id }',
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
