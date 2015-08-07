import assert from './assert';
import uuid from 'uuid';
import {graphql} from 'graphql';
import RethinkDB from 'rethinkdb';
import {createTestDatabase, deleteTestDatabase} from './testDatabase';
import getApp from '../apps/getApp';
import DBContext from '../db/DBContext';
import {toReindexID} from '../graphQL/builtins/ReindexID';

describe('Integration Tests', () => {
  const dbName = 'testdb' + uuid.v4().replace(/-/g, '_');
  const db = RethinkDB.db(dbName);
  let conn;

  before(async function () {
    conn = await RethinkDB.connect();
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    await deleteTestDatabase(conn, dbName);
    await conn.close();
  });

  async function runQuery(query, variables) {
    const app = await getApp(dbName, conn);
    const dbContext = new DBContext({db, conn});
    return await graphql(app.schema, query, {dbContext}, variables);
  }

  it('queries with node', async function() {
    const id = {
      type: 'Micropost',
      value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
    };

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

    const builtinId = {
      type: 'ReindexAuthenticationProvider',
      value: 'f2f7fb49-3581-4eou-b84b-e9489eb47d80',
    };

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
      id: builtinId,
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
        }
      }
    }`);

    assert.deepEqual(micropostResult.data, {
      getMicropost: {
        beautifulPerson: {
          nickname: 'freiksenet',
        },
        createdAt: new Date('2015-04-10T10:24:52.163Z'),
        text: 'Test text',
      },
    });

    const userId = {
      type: 'User',
      value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
    };
    const userResult = await runQuery(`
      query getUser($id: ID!) {
        getUser(id: $id) {
          handle,
          posts: microposts(orderBy: "createdAt", first: 1) {
            count,
            nodes {
              createdAt,
              text
            }
          },
          microposts {
            count
          }
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(userResult.data, {
      getUser: {
        handle: 'freiksenet',
        posts: {
          count: 4,
          nodes: [
            {
              createdAt: new Date('2015-04-10T10:24:52.163Z'),
              text: 'Test text',
            },
          ],
        },
        microposts: {
          count: 4,
        },
      },
    });
  });

  it('performs search', async function() {
    const result = await runQuery(`
      {
        searchForUser(orderBy: "handle") {
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
        searchForUser(orderBy: "handle", first: 1) {
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
    `, { id });

    assert.isNull(afterDeleted.data.getUser,
      'delete really deletes data');
  });

  it('creates a secret', async function () {
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

  // it('queries connections with only a count', async function () {
  //   let result = await queryDB(
  //     `node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) as best {
  //       microposts {
  //         count
  //       }
  //     }`
  //   );
  //
  //   assert.oequal(result, fromJS({
  //     best: {
  //       microposts: {
  //         count: 4,
  //       },
  //     },
  //   }));
  //
  //   result = await queryDB(
  //     `nodes(type: User) {
  //       objects {
  //         count
  //       }
  //     }`
  //   );
  //
  //   assert.oequal(result, fromJS({
  //     nodes: {
  //       objects: {
  //         count: 2,
  //       },
  //     },
  //   }));
  // });
  //
  // it('queries with nodes(User)', async function () {
  //
  // it('returns type information with __type__', async function() {
  //   let result = await queryDB(
  //     `nodes(type: User) {
  //       __type__ {
  //         name
  //       },
  //       objects(orderBy: handle, first: 1) {
  //         __type__ {
  //           name,
  //           parameters(orderBy: name) {
  //             nodes {
  //               name
  //             }
  //           }
  //         },
  //         nodes {
  //           __type__ {
  //             name,
  //             fields(orderBy: name) {
  //               nodes {
  //                 name
  //               }
  //             }
  //           },
  //           handle
  //         }
  //       }
  //     }`
  //   );
  //
  //   assert.oequal(result, fromJS({
  //     nodes: {
  //       __type__: {
  //         name: 'nodesResult',
  //       },
  //       objects: {
  //         __type__: {
  //           name: 'connection',
  //           parameters: {
  //             nodes: [
  //               { name: 'after' },
  //               { name: 'first' },
  //               { name: 'orderBy' },
  //             ],
  //           },
  //         },
  //         nodes: [
  //           {
  //             __type__: {
  //               name: 'User',
  //               fields: {
  //                 nodes: [
  //                   { name: '__type__' },
  //                   { name: 'handle' },
  //                   { name: 'id' },
  //                   { name: 'microposts' },
  //                 ],
  //               },
  //             },
  //             handle: 'freiksenet',
  //           },
  //         ],
  //       },
  //     },
  //   }));
  //
  //   result = await queryDB(`
  //     node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) {
  //       __type__ {
  //         name
  //       },
  //       microposts(first: 1) {
  //         __type__ {
  //           name
  //         },
  //         nodes {
  //           __type__ {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   `);
  //
  //   assert.oequal(result, fromJS({
  //     node: {
  //       __type__: {
  //         name: 'User',
  //       },
  //       microposts: {
  //         __type__: {
  //           name: 'connection',
  //         },
  //         nodes: [
  //           {
  //             __type__: {
  //               name: 'Micropost',
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   }));
  // });
  //
  // it('queries type information with schema() and type()', async function () {
  //   const typeFragment = `
  //     name,
  //     isNode,
  //     fields {
  //       nodes {
  //         name,
  //         type
  //       }
  //     },
  //     parameters {
  //       nodes {
  //         name,
  //         type
  //       }
  //     }`;
  //   const schemaResult = await queryDB(`
  //     schema() {
  //       calls(orderBy: name) {
  //         nodes {
  //           name
  //         }
  //       },
  //       types(orderBy: name) as stuff {
  //         nodes {
  //           ${typeFragment}
  //         }
  //       }
  //     }`
  //   );
  //
  //   const callNames = schemaResult
  //     .getIn(['schema', 'calls', 'nodes'])
  //     .map((call) => call.get('name'))
  //     .toSet();
  //   assert.oequal(callNames, rootCalls.keySeq().toSet());
  //
  //   for (const typeNode of schemaResult.getIn(['schema', 'stuff', '
  // nodes'])) {
  //     const result = await queryDB(`
  //       type(name: ${typeNode.get('name')}) {
  //         ${typeFragment}
  //       }`
  //     );
  //     assert.oequal(
  //       result.get('type'),
  //       typeNode
  //     );
  //   }
  //
  //   assert.oequal(await queryDB(
  //     `type(name: User) {
  //       name,
  //       isNode,
  //       fields {
  //         nodes {
  //           name,
  //           type
  //         }
  //       }
  //     }`
  //   ), fromJS({
  //     type: {
  //       name: 'User',
  //       isNode: true,
  //       fields: {
  //         nodes: [
  //           {
  //             name: '__type__',
  //             type: 'type',
  //           },
  //           {
  //             name: 'id',
  //             type: 'string',
  //           },
  //           {
  //             name: 'handle',
  //             type: 'string',
  //           },
  //           {
  //             name: 'microposts',
  //             type: 'connection',
  //           },
  //         ],
  //       },
  //     },
  //   }));
  // });
  //
  // it('does schema modifications', async function () {
  //   assert.oequal(await queryDB(
  //     `createType(name: Test) { name }`
  //   ), fromJS({
  //     createType: {
  //       name: 'Test',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `createField(type: Test, fieldName: test, fieldType: string) {
  //       name
  //     }`
  //   ), fromJS({
  //     createField: {
  //       name: 'Test',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `deleteField(type: Test, fieldName: test) {
  //       name
  //     }`
  //   ), fromJS({
  //     deleteField: {
  //       name: 'Test',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `createConnection(type: User, targetType: Micropost,
  //                    fieldName: reviewedPosts,
  //                    targetFieldName: reviewedBy) {
  //        name,
  //      }`
  //   ), fromJS({
  //     createConnection: {
  //       name: 'User',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `deleteConnection(type: User, fieldName: reviewedPosts) {
  //       name,
  //     }`
  //   ), fromJS({
  //     deleteConnection: {
  //       name: 'User',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `createIndex(type: User, name: handle, fields: \\[\\"handle\\"\\]) {
  //       name,
  //     }`
  //   ), fromJS({
  //     createIndex: {
  //       name: 'User',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `deleteIndex(type: User, name: handle) {
  //       name,
  //     }`
  //   ), fromJS({
  //     deleteIndex: {
  //       name: 'User',
  //     },
  //   }));
  //
  //   assert.oequal(await queryDB(
  //     `deleteType(name: Test) { name }`
  //   ), fromJS({
  //     deleteType: {
  //       name: 'Test',
  //     },
  //   }));
  // });
  //
  // it('creates a secret', async function () {
  //   const result = await runQuery(`createSecret() { value }`);
  //   assert.match(result.createSecret.value, /^[a-zA-Z0-9_-]{40}$/);
  // });
  //
  // it('does CRUD', async function() {
  //   const createResult = await queryDB(
  //     `create(type: User, data: \\{"handle":"newUser"\\}) {
  //       id, handle
  //     }`
  //   );
  //   const id = createResult.getIn(['create', 'id']);
  //   assert.oequal((await queryDB(
  //     `node(type: User, id: ${id}) {
  //       id, handle
  //     }`
  //   )).get('node'), createResult.get('create'));
  //
  //   const micropostResult = await queryDB(
  //     `create(type: Micropost, data:
  //       \\{"author": "${id}"\\, "text": "text"\\,
  //          "createdAt": "2014-05-07T18:00:00Z"\\}) {
  //       id, text, createdAt, author {
  //         handle
  //       }
  //     }`
  //   );
  //   const micropostId = micropostResult.getIn(['create', 'id']);
  //   assert.oequal((await queryDB(
  //     `node(type: Micropost, id: ${micropostId}) {
  //       id, text, createdAt, author {
  //         handle
  //       }
  //     }`
  //   )).get('node'), micropostResult.get('create'));
  //
  //   const updateResult = await queryDB(
  //     `update(type: User, id: ${id}, data:
  //       \\{"handle": "mikhail"\\}) {
  //       id, handle
  //     }`
  //   );
  //   assert.oequal((await queryDB(
  //     `node(type: User, id: ${id}) {
  //       id, handle
  //     }`
  //   )).get('node'), updateResult.get('update'));
  //
  //   const deleteResult = await queryDB(
  //     `delete(type: User, id: ${id}) {
  //       id
  //     }`
  //   );
  //   assert.equal(deleteResult.getIn(['delete', 'id']), id);
  //
  //   try {
  //     await queryDB(
  //       `node(type: User, id: ${id}) {
  //         id, handle
  //       }`
  //     );
  //   } catch(e) {
  //     assert.ok(e);
  //     return;
  //   }
  //   assert.fail('', '', 'Expected retrieval of deleted node to fail');
  // });
});
