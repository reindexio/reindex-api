import { forEach } from 'lodash';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import { graphql } from 'graphql';

import { PERMISSION_TABLE } from '../db/DBTableNames';
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

  before(async function () {
    conn = await RethinkDB.connect({ db });
    await createTestDatabase(conn, db);
    return RethinkDB.db(db).table(PERMISSION_TABLE).insert([
      {
        type: 'User',
        user: 'creatorUser',
        create: true,
        update: true,
        delete: false,
      },
      {
        type: 'User',
        user: 'banReadUser',
        read: false,
      },
      {
        type: 'User',
        user: null,
        read: true,
      },
      {
        type: 'Micropost',
        user: 'micropostReader',
        read: true,
      },
      {
        type: 'User',
        user: 'micropostReader',
        read: false,
      },
    ]).run(conn);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await conn.close();
  });

  async function runQuery(query, credentials = {
    isAdmin: false,
    userID: null,
  }, variables) {
    const context = await getGraphQLContext(conn, { credentials });
    return await graphql(context.schema, query, context, variables);
  }

  it('node uses permissions properly', async function() {
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

  it('no one can read micropost', async function() {
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

  it('admin has all permissions everything', async function() {
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

  it('anonymous can read user', async function() {
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

  it('anonymous permissions propagate', async function() {
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

  it('one of the users is forbidden from reading user', async function() {
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

  it('one user can create, read, but not delete', async function() {
    const clientMutationId = 'my-client-mutation-id';
    const created = await runQuery(`
      mutation createUser($input: _CreateUserInput) {
        createUser(input: $input) {
          clientMutationId,
          User {
            id,
          }
        }
      }
    `, {
      isAdmin: false,
      userID: 'creatorUser',
    }, {
      input: {
        clientMutationId,
        User: {
          handle: 'immonenv',
          email: 'immonenv@example.com',
        },
      },
    });

    const id = created.data.createUser.User.id;

    assert.deepEqual(created, {
      data: {
        createUser: {
          clientMutationId,
          User: {
            id,
          },
        },
      },
    });

    const updated = await runQuery(`
      mutation updateUser($input: _UpdateUserInput) {
        updateUser(input: $input) {
          clientMutationId,
          User {
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
        clientMutationId,
        User: {
          handle: 'villeimmonen',
        },
      },
    });

    assert.deepEqual(updated, {
      data: {
        updateUser: {
          clientMutationId,
          User: {
            id,
          },
        },
      },
    });

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
      isAdmin: false,
      userID: 'creatorUser',
    }, {
      input: {
        id,
        clientMutationId,
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

  it('should check permissions on connections', async function() {
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


  it('all root calls have permission validator', async function() {
    const context = await getGraphQLContext(conn, {
      credentials: {
        isAdmin: false,
        // User that has no perms
        userID: 'banReadUser',
      },
    });
    const rootFields = {
      ...context.schema.getType('ReindexQueryRoot').getFields(),
      ...context.schema.getType('ReindexMutationRoot').getFields(),
    };
    // This test is a bit crude, but I think it works for checking that
    // there are no unprotected root calls.
    forEach(rootFields, (call) => {
      assert.throws(
        // We pass parametes so that node knows how to validate
        () => call.resolve(context, {
          id: { type: 'Micropost' },
        }, { rootValue: context }),
        /lacks permissions/
      );
    });
  });
});
