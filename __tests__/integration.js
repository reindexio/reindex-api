import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import { graphql } from 'graphql';

import { getMetadata } from '../db/queries/simpleQueries';
import { TYPE_TABLE } from '../db/DBTableNames';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import { fromReindexID, toReindexID } from '../graphQL/builtins/ReindexID';
import { toCursor } from '../graphQL/builtins/Cursor';
import assert from '../test/assert';
import {
  createTestDatabase,
  deleteTestDatabase,
  TEST_DATA
} from '../test/testDatabase';

describe('Integration Tests', () => {
  const db = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;

  before(async function () {
    conn = await RethinkDB.connect({ db });
    return await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await conn.close();
  });

  async function runQuery(query, variables, credentials = {
    isAdmin: true,
    userID: 'admin',
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

    assert.deepEqual(result.data, {
      node: {
        text: 'Test text',
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

    assert.deepEqual(builtinResult.data, {
      node: {
        type: 'github',
        isEnabled: true,
      },
    });
  });

  it('queries by id', async function() {
    const micropostId = toReindexID({
      type: 'Micropost',
      value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
    });
    const micropostResult = await runQuery(`{
      getMicropost(id: "${micropostId}") {
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
        getMicropost: {
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
      query getUser($id: ID!) {
        getUser(id: $id) {
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
        getUser: {
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

  it('queries viewer', async function () {
    const user = TEST_DATA.getIn(['tables', 'User', 0]).toJS();
    const credentials = { isAdmin: true, userID: user.id };
    assert.deepEqual(
      await runQuery(`{viewer{handle}}`, null, credentials),
      { data: { viewer: { handle: user.handle } } }
    );
  });

  it('works with edges and cursor', async function () {
    const userId = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    const result = await runQuery(`
      {
        getUser(id: "${userId}") {
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
        getUser: {
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
      mutation createUser($input: _CreateUserInput) {
        createUser(input: $input) {
          clientMutationId,
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

    assert.deepProperty(created, 'data.createUser.changedUser.id');

    const id = created.data.createUser.changedUser.id;

    assert.deepEqual(created, {
      data: {
        createUser: {
          clientMutationId,
          changedUser: {
            id,
            handle: 'immonenv',
            email: 'immonenv@example.com',
          },
          changedUserEdge: {
            node: {
              id,
            },
            cursor: toCursor({
              value: fromReindexID(id).value,
            }),
          },
        },
      },
    }, 'create works');

    const updated = await runQuery(`
      mutation updateUser($input: _UpdateUserInput) {
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
      mutation replaceUser($input: _ReplaceUserInput) {
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
      mutation deleteUser($input: _DeleteUserInput) {
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
      query getUser($id: ID!) {
        getUser(id: $id) {
          id,
          handle,
          email
        }
      }
    `, {
      id,
    });

    assert.isNull(afterDeleted.data.getUser,
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
      mutation postMicropost($input: _CreateMicropostInput) {
        createMicropost(input: $input) {
          changedMicropost {
            text,
            createdAt,
            author {
              id
            }
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
      mutation postMicropost($input: _CreateMicropostInput) {
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

  it('works with types', async function() {
    const result = await runQuery(`{
      schema {
        types(orderBy: {field: "name"}) {
          nodes {
            name,
            kind,
            interfaces
          }
        }
      }
    }`);

    assert.deepEqual(result, {
      data: {
        schema: {
          types: {
            nodes: TEST_DATA
              .getIn(['tables', TYPE_TABLE])
              .map((type) => type.delete('fields'))
              .toJS(),
          },
        },
      },
    });

    const newType = {
      name: 'NewType',
      kind: 'OBJECT',
      interfaces: ['Node'],
      fields: [
        {
          name: 'name',
          type: 'String',
          nonNull: false,
        },
      ],
    };

    const newTypeWithId = {
      ...newType,
      fields: [
        ...newType.fields,
        {
          name: 'id',
          type: 'ID',
          nonNull: true,
        },
      ],
    };

    const newTypeResult = await runQuery(`
      mutation createType($input: _CreateReindexTypeInput!) {
        createReindexType(input: $input) {
          changedReindexType {
            id,
            name,
            kind,
            interfaces,
            fields {
              name,
              type,
              nonNull,
            }
          }
        }
      }
    `, {
      input: newType,
    });

    assert.deepEqual(newTypeResult, {
      data: {
        createReindexType: {
          changedReindexType: {
            ...newTypeWithId,
            id: newTypeResult.data.createReindexType.changedReindexType.id,
          },
        },
      },
    });

    const id = newTypeResult.data.createReindexType.changedReindexType.id;
    const deleteTypeResult = await runQuery(`
      mutation deleteType($input: _DeleteReindexTypeInput!) {
        deleteReindexType(input: $input) {
          changedReindexType {
            id,
            name,
            kind,
            interfaces,
            fields {
              name,
              type,
              nonNull,
            }
          }
        }
      }
    `, {
      input: {
        id,
      },
    });

    assert.deepEqual(deleteTypeResult, {
      data: {
        deleteReindexType: {
          changedReindexType: {
            ...newTypeWithId,
            id,
          },
        },
      },
    });
  });
});
