import { fromJS } from 'immutable';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import { graphql } from 'graphql';

import createSchema from '../graphQL/createSchema';
import { TYPE_TABLE } from '../db/DBConstants';
import { getTypes, getIndexes } from '../db/queries/simpleQueries';
import { toReindexID } from '../graphQL/builtins/ReindexID';
import extractIndexes from '../db/extractIndexes';
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

  async function runQuery(query, variables) {
    const typePromise = getTypes(conn);
    const indexPromise = getIndexes(conn);
    const indexes = extractIndexes(fromJS(await indexPromise));
    const schema = createSchema(fromJS(await typePromise));
    return await graphql(schema, query, { conn, indexes }, variables);
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

    assert.deepEqual(micropostResult.data, {
      getMicropost: {
        beautifulPerson: {
          nickname: 'freiksenet',
        },
        createdAt: '2015-04-10T10:24:52.163Z',
        text: 'Test text',
        tags: [],
      },
    });

    const userId = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    // TODO(freiksenet, 2015-08-17): doesn't work because it creates indexes
    // concurrently.
    // const userResult = await runQuery(`
    //   query getUser($id: ID!) {
    //     getUser(id: $id) {
    //       handle,
    //       posts: microposts(orderBy: {field: "createdAt"}, first: 1) {
    //         count,
    //         nodes {
    //           createdAt,
    //           text
    //         }
    //       },
    //       microposts {
    //         count
    //       }
    //     }
    //   }
    // `, {
    //   id: userId,
    // });
    //
    // assert.deepEqual(userResult.data, {
    //   getUser: {
    //     handle: 'freiksenet',
    //     posts: {
    //       count: 7,
    //       nodes: [
    //         {
    //           createdAt: new Date('2015-04-10T10:24:52.163Z'),
    //           text: 'Test text',
    //         },
    //       ],
    //     },
    //     microposts: {
    //       count: 7,
    //     },
    //   },
    // });

    const userResult = await runQuery(`
      query getUser($id: ID!) {
        getUser(id: $id) {
          handle,
          posts: microposts(orderBy: {field: "createdAt"}, first: 1) {
            count,
            nodes {
              createdAt,
              text
            }
          },
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(userResult.data, {
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
      },
    });
  });

  it('works with edges and cursor', async function () {
    const userId = toReindexID({
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    });

    const result = await runQuery(`
      {
        getUser(id: "${userId}") {
          microposts(orderBy: {field: "createdAt"}, first: 1) {
            edges {
              node {
                text
              }
            }
          }
        }
      }
    `);

    assert.deepEqual(result.data, {
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
    });
  });

  it('does crud', async function() {
    const clientMutationId = 'my-client-mutation-id';
    const created = await runQuery(`
      mutation createUser($input: _CreateUserInput) {
        createUser(input: $input) {
          clientMutationId,
          User {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        clientMutationId,
        User: {
          handle: 'immonenv',
          email: 'immonenv@example.com',
        },
      },
    });

    const id = created.data.createUser.User.id;

    assert.deepEqual(created.data.createUser, {
      clientMutationId,
      User: {
        id,
        handle: 'immonenv',
        email: 'immonenv@example.com',
      },
    }, 'create works');

    const updated = await runQuery(`
      mutation updateUser($input: _UpdateUserInput) {
        updateUser(input: $input) {
          clientMutationId,
          User {
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
        User: {
          handle: 'villeimmonen',
        },
      },
    });

    assert.deepEqual(updated.data.updateUser, {
      clientMutationId,
      User: {
        id,
        handle: 'villeimmonen',
        email: 'immonenv@example.com',
      },
    }, 'update works');

    const replaced = await runQuery(`
      mutation replaceUser($input: _ReplaceUserInput) {
        replaceUser(input: $input) {
          clientMutationId,
          User {
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
        User: {
          handle: 'immonenv',
        },
      },
    });

    assert.deepEqual(replaced.data.replaceUser, {
      clientMutationId,
      User: {
        id,
        handle: 'immonenv',
        email: null,
      },
    }, 'replace works');

    const deleted = await runQuery(`
      mutation deleteUser($input: _DeleteUserInput) {
        deleteUser(input: $input) {
          clientMutationId,
          User {
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
          Micropost {
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
        Micropost: micropost,
      },
    });

    assert.deepEqual(result.data.createMicropost.Micropost, {
      ...micropost,
      createdAt: micropost.createdAt,
      author: {
        id: authorID,
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
          Micropost {
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
        Micropost: micropost,
      },
    });

    assert.deepEqual(result.data.createMicropost.Micropost, micropost);
  });

  it('creates a secret', async function() {
    const result = await runQuery(`
      mutation secret {
        createReindexSecret(input: {clientMutationId: "mutation"}) {
          ReindexSecret {
            value
          }
        }
      }
    `);
    assert.match(
      result.data.createReindexSecret.ReindexSecret.value,
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
          ReindexType {
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
        clientMutationId: 'mutation',
        ReindexType: newType,
      },
    });

    const id = newTypeResult.data.createReindexType.ReindexType.id;

    assert.deepEqual(newTypeResult, {
      data: {
        createReindexType: {
          ReindexType: {
            ...newTypeWithId,
            id,
          },
        },
      },
    });

    const deleteTypeResult = await runQuery(`
      mutation deleteType($input: _DeleteReindexTypeInput!) {
        deleteReindexType(input: $input) {
          ReindexType {
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
        clientMutationId: 'mutation',
        id,
      },
    });

    assert.deepEqual(deleteTypeResult, {
      data: {
        deleteReindexType: {
          ReindexType: {
            ...newTypeWithId,
            id,
          },
        },
      },
    });
  });
});
