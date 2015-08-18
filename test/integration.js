import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';

import assert from './assert';
import createSchema from '../graphQL/createSchema';
import {graphql} from 'graphql';
import {createTestDatabase, deleteTestDatabase} from './testDatabase';
import {getTypes} from '../db/queries/simple';
import {toReindexID} from '../graphQL/builtins/ReindexID';
import extractIndexes from '../db/extractIndexes';

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
    const types = Immutable.fromJS(await getTypes(conn));
    const schema = createSchema(types);
    const indexes = extractIndexes(types);
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

  it('performs search', async function() {
    const result = await runQuery(`
      {
        searchForUser(orderBy: {field: "handle"}) {
          nodes {
            handle
          }
        }
      }
    `);

    assert.deepEqual(result.data, {
      searchForUser: {
        nodes: [
          { handle: 'freiksenet' },
          { handle: 'fson' },
        ],
      },
    });
  });

  it('works with edges and cursor', async function () {
    const result = await runQuery(`
      {
        searchForUser(orderBy: {field: "handle"}, first: 1) {
          edges {
            node {
              handle
            }
          }
        }
      }
    `);

    assert.deepEqual(result.data, {
      searchForUser: {
        edges: [
          {
            node: {
              handle: 'freiksenet',
            },
          },
        ],
      },
    });
  });

  it('does crud', async function() {
    const clientMutationId = 'my-client-mutation-id';
    const created = await runQuery(`
      mutation createUser($User: _UserInputObject!, $clientMutationId: String) {
        createUser(User: $User, clientMutationId: $clientMutationId) {
          clientMutationId,
          User {
            id,
            handle,
            email
          }
        }
      }
    `, {
      clientMutationId,
      User: {
        handle: 'immonenv',
        email: 'immonenv@example.com',
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
      mutation updateUser($id: ID!, $User: _UserInputObject!,
                          $clientMutationId: String) {
        updateUser(id: $id, User: $User, clientMutationId: $clientMutationId) {
          clientMutationId,
          User {
            id,
            handle,
            email
          }
        }
      }
    `, {
      id,
      clientMutationId,
      User: {
        handle: 'villeimmonen',
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
      mutation replaceUser($id: ID!, $User: _UserInputObject!,
                           $clientMutationId: String) {
        replaceUser(id: $id, User: $User, clientMutationId: $clientMutationId) {
          clientMutationId,
          User {
            id,
            handle,
            email
          }
        }
      }
    `, {
      id,
      clientMutationId,
      User: {
        handle: 'immonenv',
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
      mutation deleteUser($id: ID!, $clientMutationId: String) {
        deleteUser(id: $id, clientMutationId: $clientMutationId) {
          clientMutationId,
          User {
            id,
            handle,
            email
          }
        }
      }
    `, {
      id,
      clientMutationId,
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
      mutation postMicropost($Micropost: _MicropostInputObject!) {
        createMicropost(Micropost: $Micropost) {
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
      Micropost: micropost,
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
      mutation postMicropost($Micropost: _MicropostInputObject!) {
        createMicropost(Micropost: $Micropost) {
          Micropost {
            text,
            tags,
            categories { name },
            mainCategory { name }
          }
        }
      }
    `, {
      Micropost: micropost,
    });

    assert.deepEqual(result.data.createMicropost.Micropost, micropost);
  });

  it('creates a secret', async function() {
    const result = await runQuery(`
      mutation secret {
        createReindexSecret {
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
});
