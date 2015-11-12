import { get } from 'lodash';
import uuid from 'uuid';
import { graphql } from 'graphql';

import { getConnection, releaseConnection } from '../db/dbConnections';
import { getMetadata } from '../db/queries/simpleQueries';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import { fromReindexID, toReindexID } from '../graphQL/builtins/ReindexID';
import { toCursor } from '../graphQL/builtins/Cursor';
import assert from '../test/assert';
import {
  createTestDatabase,
  deleteTestDatabase,
  TEST_DATA,
} from '../test/testDatabase';

describe('Integration Tests', () => {
  const db = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;

  before(async function () {
    conn = await getConnection(db);
    return await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await releaseConnection(conn);
  });

  async function runQuery(query, variables, credentials = {
    isAdmin: true,
    userID: null,
  }) {
    const context = getGraphQLContext(conn, await getMetadata(conn), {
      credentials,
    });
    return await graphql(context.schema, query, context, variables);
  }

  it('queries with node', async function() {
    const id = toReindexID({
      type: 'Micropost',
      value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
    });

    const result = await runQuery(`
      query nodetest($id: ID!) {
        node(id: $id) {
          ... on Micropost {
            text
          }
        }
      }
    `, {
      id,
    });

    assert.deepEqual(result, {
      data: {
        node: {
          text: 'Test text',
        },
      },
    });

    const builtinID = toReindexID({
      type: 'ReindexAuthenticationProvider',
      value: 'f2f7fb49-3581-4eou-b84b-e9489eb47d80',
    });

    const builtinResult = await runQuery(`
      query nodetest($id: ID!) {
        node(id: $id) {
          ... on ReindexAuthenticationProvider {
            type,
            isEnabled
          }
        }
      }
    `, {
      id: builtinID,
    });

    assert.deepEqual(builtinResult, {
      data: {
        node: {
          type: 'github',
          isEnabled: true,
        },
      },
    });
  });

  it('queries by id', async function() {
    const micropostId = toReindexID({
      type: 'Micropost',
      value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
    });
    const micropostResult = await runQuery(`{
      micropostById(id: "${micropostId}") {
        text,
        createdAt,
        beautifulPerson: author {
          nickname: handle
        },
        tags
      }
    }`);

    assert.deepEqual(micropostResult, {
      data: {
        micropostById: {
          beautifulPerson: {
            nickname: 'freiksenet',
          },
          createdAt: '2015-04-10T10:24:52.163Z',
          text: 'Test text',
          tags: [],
        },
      },
    });

    const userId = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    const userResult = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          handle,
          posts: microposts(orderBy: {field: "createdAt"}, first: 1) {
            count,
            nodes {
              createdAt,
              text,
            }
          },
          microposts {
            count,
          },
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(userResult, {
      data: {
        userById: {
          handle: 'freiksenet',
          posts: {
            count: 7,
            nodes: [
              {
                createdAt: '2015-04-10T10:24:52.163Z',
                text: 'Test text',
              },
            ],
          },
          microposts: {
            count: 7,
          },
        },
      },
    });
  });

  it('queries through unique fields', async () => {
    const result = await runQuery(`
      {
        userByHandle(handle: "freiksenet") {
          handle
        }
      }`
    );

    assert.deepEqual(result, {
      data: {
        userByHandle: {
          handle: 'freiksenet',
        },
      },
    });

    assert.deepEqual(await runQuery(`
      {
        userByHandle(handle: "nonsense") {
          handle
        }
      }
    `), {
      data: {
        userByHandle: null,
      },
    });
  });

  it('queries viewer for user', async function () {
    const user = TEST_DATA.getIn(['tables', 'User', 0]).toJS();
    const credentials = { isAdmin: true, userID: user.id };
    assert.deepEqual(
      await runQuery(`{ viewer { user { handle } } }`, null, credentials),
      { data: { viewer: { user: { handle: user.handle } } } }
    );
  });

  it('queries viewer list', async function() {
    assert.deepEqual(
      await runQuery(`{
        viewer {
          allReindexTypes {
            count
          }
          allMicroposts(first: 1) {
            nodes {
              text
            }
          }
        }
      }`),
      {
        data: {
          viewer: {
            allReindexTypes: {
              count: 3,
            },
            allMicroposts: {
              nodes: [
                {
                  text: 'Test text 4',
                },
              ],
            },
          },
        },
      }
    );
  });

  it('works with edges and cursor', async function () {
    const userId = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    const result = await runQuery(`
      {
        userById(id: "${userId}") {
          microposts(first: 1) {
            edges {
              node {
                text
              }
            }
          }
        }
      }
    `);

    assert.deepEqual(result, {
      data: {
        userById: {
          microposts: {
            edges: [
              {
                node: {
                  text: 'Test text',
                },
              },
            ],
          },
        },
      },
    });
  });

  it('does crud', async function() {
    const clientMutationId = 'my-client-mutation-id';
    const created = await runQuery(`
      mutation createUser($input: _CreateUserInput!) {
        createUser(input: $input) {
          clientMutationId,
          id,
          changedUser {
            id,
            handle,
            email
          },
          changedUserEdge {
            node {
              id
            },
            cursor
          },
          viewer {
            allUsers {
              count
            }
          }
        }
      }
    `, {
      input: {
        clientMutationId,
        handle: 'immonenv',
        email: 'immonenv@example.com',
      },
    });

    const id = get(created, ['data', 'createUser', 'changedUser', 'id']);

    assert.deepEqual(created, {
      data: {
        createUser: {
          clientMutationId,
          id,
          changedUser: {
            id,
            handle: 'immonenv',
            email: 'immonenv@example.com',
          },
          changedUserEdge: {
            node: {
              id,
            },
            cursor: id && toCursor({
              value: fromReindexID(id).value,
            }),
          },
          viewer: {
            allUsers: {
              count: 3,
            },
          },
        },
      },
    }, 'create works');

    assert.isDefined(id, 'created with proper id');

    const updated = await runQuery(`
      mutation updateUser($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        handle: 'villeimmonen',
      },
    });

    assert.deepEqual(updated, {
      data: {
        updateUser: {
          clientMutationId: null,
          changedUser: {
            id,
            handle: 'villeimmonen',
            email: 'immonenv@example.com',
          },
        },
      },
    }, 'update works');

    const replaced = await runQuery(`
      mutation replaceUser($input: _ReplaceUserInput!) {
        replaceUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        clientMutationId,
        handle: 'immonenv',
      },
    });

    assert.deepEqual(replaced, {
      data: {
        replaceUser: {
          clientMutationId,
          changedUser: {
            id,
            handle: 'immonenv',
            email: null,
          },
        },
      },
    }, 'replace works');

    const deleted = await runQuery(`
      mutation deleteUser($input: _DeleteUserInput!) {
        deleteUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        clientMutationId,
      },
    });

    assert.deepEqual(deleted.data.deleteUser, replaced.data.replaceUser,
      'delete returns deleted data');

    const afterDeleted = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          id,
          handle,
          email
        }
      }
    `, {
      id,
    });

    assert.isNull(afterDeleted.data.userById,
      'delete really deletes data');
  });

  it('saves connections correctly', async function() {
    const authorID = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });
    const micropost = {
      text: 'Sample text',
      createdAt: '2014-05-12T18:00:00.000Z',
      author: authorID,
    };
    const result = await runQuery(`
      mutation postMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            text,
            createdAt,
            author {
              id
            }
          },
          author {
            id
          }
        }
      }
    `, {
      input: {
        clientMutationId: '1',
        ...micropost,
      },
    });

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: {
            ...micropost,
            createdAt: micropost.createdAt,
            author: {
              id: authorID,
            },
          },
          author: {
            id: authorID,
          },
        },
      },
    });
  });

  it('validates uniqueness', async () => {
    const id = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    let result = await runQuery(`
      mutation createDuplicateUser($input: _CreateUserInput!) {
        createUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        handle: 'freiksenet',
      },
    });

    assert.deepEqual(result, {
      data: {
        createUser: null,
      },
      errors: [
        {
          message: 'User.handle: value must be unique, got "freiksenet"',
        },
      ],
    });

    result = await runQuery(`
      mutation updateUserToDuplicate($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: 'fson',
      },
    });

    assert.deepEqual(result, {
      data: {
        updateUser: null,
      },
      errors: [
        {
          message: 'User.handle: value must be unique, got "fson"',
        },
      ],
    });

    result = await runQuery(`
      mutation replaceUserToDuplicate($input: _ReplaceUserInput!) {
        replaceUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: 'fson',
      },
    });

    assert.deepEqual(result, {
      data: {
        replaceUser: null,
      },
      errors: [
        {
          message: 'User.handle: value must be unique, got "fson"',
        },
      ],
    });

    result = await runQuery(`
      mutation updateUserToSame($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: 'freiksenet',
      },
    });

    assert.deepEqual(result, {
      data: {
        updateUser: {
          changedUser: {
            handle: 'freiksenet',
          },
        },
      },
    });
  });

  it('saves arrays and embedded objects correctly', async function() {
    const micropost = {
      text: 'GraphQL is awesome',
      tags: [
        'graphql',
      ],
      categories: [
        {
          name: 'Programming',
        },
        {
          name: 'Art',
        },
      ],
      mainCategory: {
        name: 'Programming',
      },
    };
    const result = await runQuery(`
      mutation postMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            text,
            tags,
            categories { name },
            mainCategory { name }
          }
        }
      }
    `, {
      input: {
        clientMutationId: '1',
        ...micropost,
      },
    });

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: micropost,
        },
      },
    });
  });

  it('creates a secret', async function() {
    const result = await runQuery(`
      mutation secret {
        createReindexSecret(input: {clientMutationId: "mutation"}) {
          changedReindexSecret {
            value
          }
        }
      }
    `);

    assert.match(
      result.data.createReindexSecret.changedReindexSecret.value,
      /^[a-zA-Z0-9_-]{40}$/
    );
  });

  it('handles null nodes and inlines', async function() {
    let result = await runQuery(`
      mutation createMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            id,
            text,
            author {
              id
            },
            categories {
              name
            },
            mainCategory {
              name
            },
          }
        }
      }`,
      {
        input: {
          text: 'Test',
        },
      }
    );

    const id = get(result, [
      'data', 'createMicropost', 'changedMicropost', 'id',
    ]);

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: {
            id,
            text: 'Test',
            author: null,
            categories: null,
            mainCategory: null,
          },
        },
      },
    });

    assert.isDefined(id, 'created with proper id');

    result = await runQuery(`
      query micropostById($id: ID!) {
        micropostById(id: $id) {
          id,
          text,
          author {
            id,
          },
          categories {
            name,
          },
          mainCategory {
            name,
          },
        },
      }
    `, {
      id,
    });

    assert.deepEqual(result, {
      data: {
        micropostById: {
          id,
          text: 'Test',
          author: null,
          categories: null,
          mainCategory: null,
        },
      },
    });

    result = await runQuery(`
      mutation deleteMicropost($input: _DeleteMicropostInput!) {
        deleteMicropost(input: $input) {
          id,
        }
      }`,
      {
        input: {
          id,
        },
      }
    );

    assert.deepEqual(result, {
      data: {
        deleteMicropost: {
          id,
        },
      },
    });
  });
});
