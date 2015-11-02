import { chain, get } from 'lodash';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import { graphql } from 'graphql';

import { getConnection, releaseConnection } from '../db/dbConnections';
import { getMetadata } from '../db/queries/simpleQueries';
import { PERMISSION_TABLE, TYPE_TABLE } from '../db/DBTableNames';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import { toReindexID } from '../graphQL/builtins/ReindexID';
import assert from '../test/assert';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../test/testDatabase';


describe('Permissions', () => {
  const db = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;
  let typesByName;

  function getTypeID(type) {
    return {
      type: 'ReindexType',
      value: typesByName[type],
    };
  }

  before(async function () {
    conn = await getConnection(db);
    await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await releaseConnection(conn);
  });

  async function runQuery(query, credentials = {
    isAdmin: false,
    userID: null,
  }, variables) {
    const context = getGraphQLContext(conn, await getMetadata(conn), {
      credentials,
    });
    return await graphql(context.schema, query, context, variables);
  }

  describe('type permissions', () => {
    before(async () => {
      const types = await RethinkDB
        .db(db)
        .table(TYPE_TABLE)
        .coerceTo('array')
        .run(conn);
      typesByName = chain(types)
        .groupBy((type) => type.name)
        .mapValues((value) => value[0].id)
        .value();

      RethinkDB.db(db).table(PERMISSION_TABLE).insert([
        {
          type: getTypeID('User'),
          user: {
            type: 'User',
            value: 'creatorUser',
          },
          create: true,
          update: true,
          delete: false,
        },
        {
          type: getTypeID('User'),
          user: {
            type: 'User',
            value: 'banReadUser',
          },
          read: false,
        },
        {
          type: getTypeID('User'),
          user: null,
          read: true,
        },
        {
          type: getTypeID('Micropost'),
          user: {
            type: 'User',
            value: 'micropostReader',
          },
          read: true,
        },
        {
          type: getTypeID('User'),
          user: {
            type: 'User',
            value: 'micropostReader',
          },
          read: false,
        },
      ]).run(conn);
    });

    after(() => {
      RethinkDB.db(db).table(PERMISSION_TABLE).delete().run(conn);
    });

    it('wildcard permissions', async () => {
      const permission = await runQuery(`mutation createPermission {
        createReindexPermission(input: {
          read: true,
          create: true,
          update: true,
          delete: true,
        }) {
          changedReindexPermission {
            id
          }
        }
      }`, {
        isAdmin: true,
      });

      const permissionId = get(permission, [
        'data', 'createReindexPermission', 'changedReindexPermission', 'id',
      ]);

      const id = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`{ node(id: "${id}") { id } }`), {
        data: {
          node: {
            id,
          },
        },
      });

      assert.deepProperty(await runQuery(`mutation deletePermission {
        deleteReindexPermission(input: {
          id: "${permissionId}"
        }) {
          changedReindexPermission {
            id
          }
        }
      }`, {
        isAdmin: true,
      }), 'data.deleteReindexPermission.changedReindexPermission.id');
    });

    it('node uses permissions properly', async () => {
      const id = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`{ node(id: "${id}") { id } }`), {
        data: {
          node: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });

      const userID = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`{ node(id: "${userID}") { id } }`), {
        data: {
          node: {
            id: userID,
          },
        },
      });
    });

    it('no one can read micropost', async () => {
      const id = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`{ getMicropost(id: "${id}") { id } }`), {
        data: {
          getMicropost: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });
    });

    it('admin has all permissions', async () => {
      const id = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`{ getMicropost(id: "${id}") { id } }`, {
        isAdmin: true,
      }), {
        data: {
          getMicropost: {
            id,
          },
        },
      });
    });

    it('anonymous can read user', async () => {
      const id = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`{ getUser(id: "${id}") { id } }`), {
        data: {
          getUser: {
            id,
          },
        },
      });
    });

    it('anonymous permissions propagate', async () => {
      const id = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`{ getUser(id: "${id}") { id } }`, {
        isAdmin: false,
        userID: 'creatorUser',
      }), {
        data: {
          getUser: {
            id,
          },
        },
      });
    });

    it('one of the users is forbidden from reading user', async () => {
      const id = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`{ getUser(id: "${id}") { id } }`, {
        isAdmin: false,
        userID: 'banReadUser',
      }), {
        data: {
          getUser: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type User',
          },
        ],
      });
    });

    it('one user can create, read, but not delete', async () => {
      const created = await runQuery(`
        mutation createUser($input: _CreateUserInput!) {
          createUser(input: $input) {
            changedUser {
              id,
            }
          }
        }
      `, {
        isAdmin: false,
        userID: 'creatorUser',
      }, {
        input: {
          handle: 'immonenv',
          email: 'immonenv@example.com',
        },
      });

      const id = get(created, ['data', 'createUser', 'changedUser', 'id']);

      assert.deepEqual(created, {
        data: {
          createUser: {
            changedUser: {
              id,
            },
          },
        },
      });

      assert.isDefined(id, 'created with proper id');

      const updated = await runQuery(`
        mutation updateUser($input: _UpdateUserInput!) {
          updateUser(input: $input) {
            changedUser {
              id
            }
          }
        }
      `, {
        isAdmin: false,
        userID: 'creatorUser',
      }, {
        input: {
          id,
          handle: 'villeimmonen',
        },
      });

      assert.deepEqual(updated, {
        data: {
          updateUser: {
            changedUser: {
              id,
            },
          },
        },
      });

      const deleted = await runQuery(`
        mutation deleteUser($input: _DeleteUserInput!) {
          deleteUser(input: $input) {
            changedUser {
              id,
              handle,
              email
            }
          }
        }
      `, {
        isAdmin: false,
        userID: 'creatorUser',
      }, {
        input: {
          id,
        },
      });

      assert.deepEqual(deleted, {
        data: {
          deleteUser: null,
        },
        errors: [
          {
            message: 'User lacks permissions to delete records of type User',
          },
        ],
      });
    });

    it('should check permissions on connections', async () => {
      const id = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`{
        getMicropost(id: "${id}") {
          id,
          author {
            id
          }
        }
      }`, {
        userID: 'micropostReader',
      }), {
        data: {
          getMicropost: {
            id,
            author: null,
          },
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type User',
          },
        ],
      });

      const userID = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`{
        getUser(id: "${userID}") {
          id,
          microposts {
            nodes {
              id
            }
          }
        }
      }`), {
        data: {
          getUser: {
            id: userID,
            microposts: null,
          },
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });
    });
  });

  describe('connection permissions', () => {
    before(() => RethinkDB
      .db(db)
      .table(TYPE_TABLE)
      .filter({ name: 'Micropost' })
      .update((obj) => ({
        fields: obj('fields')
          .filter((field) => field('name').ne('author'))
          .append({
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
            grantPermissions: {
              read: true,
              create: true,
              update: true,
              delete: true,
            },
          }),
      }))
      .run(conn)
    );

    it('user can read himself', async () => {
      const userID = toReindexID({
        type: 'User',
        value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      });

      assert.deepEqual(await runQuery(`
        {
          getUser(id: "${userID}") {
            id
          }
        }`), {
          data: {
            getUser: null,
          },
          errors: [
            {
              message: 'User lacks permissions to read records of type User',
            },
          ],
        }
      );

      assert.deepEqual(await runQuery(`
        {
          getUser(id: "${userID}") {
            id
          }
        }
      `, {
        isAdmin: false,
        userID: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
      }), {
        data: {
          getUser: {
            id: userID,
          },
        },
      });
    });

    it('can not to do stuff to microposts of other users', async () => {
      const userID = '94b90d89-22b6-4abf-b6ad-2780bf9d0408';
      const micropostID = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
      });

      assert.deepEqual(await runQuery(`
        {
          getMicropost(id: "${micropostID}") {
            id,
          }
        }
      `, {
        userID,
      }), {
        data: {
          getMicropost: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });
    });

    it('can read own microposts', async () => {
      const userID = 'bbd1db98-4ac4-40a7-b514-968059c3dbac';
      const id = toReindexID({
        type: 'User',
        value: userID,
      });
      const micropostID = toReindexID({
        type: 'Micropost',
        value: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      });

      assert.deepEqual(await runQuery(`
        {
          getMicropost(id: "${micropostID}") {
            id,
            author {
              id
            }
          }
        }
      `, {
        userID,
      }), {
        data: {
          getMicropost: {
            id: micropostID,
            author: {
              id,
            },
          },
        },
      });

      assert.deepEqual(await runQuery(`
        {
          getUser(id: "${id}") {
            id,
            microposts(orderBy: {field: "createdAt"}, first: 1)  {
              nodes {
                id
              }
            }
          }
        }
      `, {
        userID,
      }), {
        data: {
          getUser: {
            id,
            microposts: {
              nodes: [
                {
                  id: micropostID,
                },
              ],
            },
          },
        },
      });
    });

    it('can create оr update microposts only with self as user', async () => {
      const userID = 'bbd1db98-4ac4-40a7-b514-968059c3dbac';
      const id = toReindexID({
        type: 'User',
        value: userID,
      });

      assert.deepEqual(await runQuery(`
        mutation createMicropost($input: _CreateMicropostInput!){
          createMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          clientMutationId: '',
        },
      }), {
        data: {
          createMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to create records of type Micropost'
            ),
          },
        ],
      });

      const result = await runQuery(`
        mutation createMicropost($input: _CreateMicropostInput!) {
          createMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          clientMutationId: '',
          author: id,
        },
      });


      assert.deepEqual(result, {
        data: {
          createMicropost: {
            changedMicropost: {
              id: result.data.createMicropost.changedMicropost.id,
              author: {
                id,
              },
            },
          },
        },
      });

      const micropostID = result.data.createMicropost.changedMicropost.id;

      assert.deepEqual(await runQuery(`
        mutation updateMicropost($input: _UpdateMicropostInput!) {
          updateMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          clientMutationId: '',
          id: micropostID,
          author: toReindexID({
            type: 'User',
            id: 'someOtherId',
          }),
        },
      }), {
        data: {
          updateMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update records of type Micropost'
            ),
          },
        ],
      });

      assert.deepEqual(await runQuery(`
        mutation updateMicropost($input: _UpdateMicropostInput!) {
          updateMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          clientMutationId: '',
          id: micropostID,
          text: 'foo',
        },
      }), {
        data: {
          updateMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id,
              },
            },
          },
        },
      });

      assert.deepEqual(await runQuery(`
        mutation replaceMicropost($input: _ReplaceMicropostInput!) {
          replaceMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          id: micropostID,
          text: 'foo',
        },
      }), {
        data: {
          replaceMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update records of type Micropost'
            ),
          },
        ],
      });

      assert.deepEqual(await runQuery(`
        mutation replaceMicropost($input: _ReplaceMicropostInput!) {
          replaceMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          id: micropostID,
          text: 'foozz',
          author: id,
        },
      }), {
        data: {
          replaceMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id,
              },
            },
          },
        },
      });

      assert.deepEqual(await runQuery(`
        mutation deleteMicropost($input: _DeleteMicropostInput!) {
          deleteMicropost(input: $input) {
            changedMicropost {
              id,
              author {
                id
              }
            }
          }
        }
      `, {
        userID,
      }, {
        input: {
          clientMutationId: '',
          id: micropostID,
        },
      }), {
        data: {
          deleteMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id,
              },
            },
          },
        },
      });
    });

    it('can not read posts of other users through connections', async () => {
      const userID = 'bbd1db98-4ac4-40a7-b514-968059c3dbac';
      const id = toReindexID({
        type: 'User',
        value: userID,
      });

      await RethinkDB
        .db(db)
        .table(PERMISSION_TABLE)
        .insert({
          type: getTypeID('User'),
          user: null,
          read: true,
        })
        .run(conn);

      assert.deepEqual(await runQuery(`
        {
          getUser(id: "${id}") {
            id,
            microposts {
              nodes {
                id
              }
            }
          }
        }
      `, {
        userID: null,
      }), {
        data: {
          getUser: {
            id,
            microposts: null,
          },
        },
        errors: [
          {
            message: (
              'User lacks permissions to read records of type Micropost'
            ),
          },
        ],
      });
    });
  });
});
