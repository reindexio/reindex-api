import { get } from 'lodash';
import uuid from 'uuid';

import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import { fromReindexID } from '../graphQL/builtins/ReindexID';

import { TEST_SCHEMA } from '../test/fixtures';
import {
  makeRunQuery,
  migrate,
  createTestApp,
  getTypesByName,
  createFixture,
  deleteFixture,
} from '../test/testAppUtils';

import assert from '../test/assert';

describe('Permissions', () => {
  const hostname = 'testdb_' + uuid.v4().replace(/-/g, '_') + '.example.com';
  const db = getDB(hostname);
  let runQuery;
  let typesByName;

  const fixtures = {
    User: {},
    Micropost: {},
  };

  before(async function () {
    await createTestApp(hostname);
    runQuery = makeRunQuery(db);
    typesByName = await getTypesByName(db);

    for (const handle of [
      'vanilla',
      'creator',
      'banRead',
      'micropost',
    ]) {
      fixtures.User[handle] = await createFixture(runQuery, 'User', {
        handle,
      }, 'id, handle');

      fixtures.Micropost[handle] = [];
      for (let i = 0; i < 5; i++) {
        fixtures.Micropost[handle].push(
          await createFixture(runQuery, 'Micropost', {
            author: fixtures.User[handle].id,
            text: `micropost-{i}`,
            createdAt: '@TIMESTAMP',
          }, `id`)
        );
      }
    }
  });

  after(async function () {
    await db.close();
    await deleteApp(hostname);
  });

  describe('type permissions', () => {
    const permissions = [];

    before(async () => {
      const defaultPermissions = (await runQuery(`{
        viewer {
          allReindexPermissions {
            nodes {
              id
            }
          }
        }
      }`)).data.viewer.allReindexPermissions.nodes;

      for (const permission of defaultPermissions) {
        await deleteFixture(runQuery, 'ReindexPermission', permission.id);
      }

      const permissionFixtures = [
        {
          type: typesByName.User,
          user: fixtures.User.creator.id,
          create: true,
          update: true,
          delete: false,
        },
        {
          type: typesByName.User,
          user: fixtures.User.banRead.id,
          read: false,
        },
        {
          type: typesByName.User,
          user: null,
          read: true,
        },
        {
          type: typesByName.Micropost,
          user: fixtures.User.micropost.id,
          read: true,
        },
        {
          type: typesByName.User,
          user: fixtures.User.micropost.id,
          read: false,
        },
      ];

      for (const permission of permissionFixtures) {
        permissions.push(
          await createFixture(runQuery, 'ReindexPermission', permission, 'id')
        );
      }
    });

    after(async () => {
      for (const permission of permissions) {
        await deleteFixture(runQuery, 'ReindexPermission', permission.id);
      }
    });

    it('wildcard permissions', async () => {
      const permission = await createFixture(runQuery, 'ReindexPermission', {
        read: true,
        create: true,
        update: true,
        delete: true,
      }, 'id', {
        clearContext: true,
      });

      const micropost = fixtures.Micropost.creator[0];

      assert.deepEqual(await runQuery(`
        query node($id: ID!){
          node(id: $id) {
            id
          }
        }`, {
          id: micropost.id,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(fixtures.User.vanilla.id),
          },
        }
      ), {
        data: {
          node: {
            id: micropost.id,
          },
        },
      });

      await deleteFixture(runQuery, 'ReindexPermission', permission.id, {
        clearContext: true,
      });
    });

    it('node uses permissions properly', async () => {
      const micropost = fixtures.Micropost.creator[0];
      assert.deepEqual(
        await runQuery(`{ node(id: "${micropost.id}") { id } }`, {}, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(fixtures.User.vanilla.id),
          },
        }), {
          data: {
            node: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to read records of type Micropost'
              ),
            },
          ],
        }
      );

      const user = fixtures.User.creator;
      assert.deepEqual(await runQuery(`{ node(id: "${user.id}") { id } }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.vanilla.id),
        },
      }), {
        data: {
          node: {
            id: user.id,
          },
        },
      });
    });

    it('no one can read micropost', async () => {
      const micropost = fixtures.Micropost.creator[0];

      assert.deepEqual(await runQuery(`{
        micropostById(id: "${micropost.id}") {
          id
        }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.vanilla.id),
        },
      }), {
        data: {
          micropostById: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });
    });

    it('admin has all permissions', async () => {
      const micropost = fixtures.Micropost.creator[0];

      assert.deepEqual(await runQuery(`{
        micropostById(id: "${micropost.id}") { id }
      }`, {}, {
        credentials: {
          isAdmin: true,
          userID: null,
        },
      }), {
        data: {
          micropostById: {
            id: micropost.id,
          },
        },
      });
    });

    it('anonymous can read user', async () => {
      const user = fixtures.User.vanilla;

      assert.deepEqual(await runQuery(`{
        userById(id: "${user.id}") { id }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
      }), {
        data: {
          userById: {
            id: user.id,
          },
        },
      });
    });

    it('anonymous permissions propagate', async () => {
      const user = fixtures.User.vanilla;

      assert.deepEqual(await runQuery(`{
        userById(id: "${user.id}") { id }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.creator.id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
          },
        },
      });
    });

    it('one of the users is forbidden from reading user', async () => {
      const user = fixtures.User.vanilla;

      assert.deepEqual(await runQuery(`{
        userById(id: "${user.id}") { id }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.banRead.id),
        },
      }), {
        data: {
          userById: null,
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
        input: {
          handle: 'immonenv',
          email: 'immonenv@example.com',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.creator.id),
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
        input: {
          id,
          handle: 'villeimmonen',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.creator.id),
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
        input: {
          id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.creator.id),
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
      const micropost = fixtures.Micropost.creator[0];

      assert.deepEqual(await runQuery(`{
        micropostById(id: "${micropost.id}") {
          id,
          author {
            id
          }
        }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.micropost.id),
        },
      }), {
        data: {
          micropostById: {
            id: micropost.id,
            author: null,
          },
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type User',
          },
        ],
      });

      const user = fixtures.User.creator;

      assert.deepEqual(await runQuery(`{
        userById(id: "${user.id}") {
          id,
          microposts {
            nodes {
              id
            }
          }
        }
      }`, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.vanilla.id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
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
    before(async () => {
      const micropost = TEST_SCHEMA.find((type) => type.name === 'Micropost');
      const micropostFields = micropost.fields.filter(
        (field) => field.name !== 'author'
      );
      const rest = TEST_SCHEMA.filter((type) => type.name !== 'Micropost');
      const newSchema = [
        {
          ...micropost,
          fields: [
            ...micropostFields,
            {
              name: 'author',
              type: 'User',
              reverseName: 'microposts',
              grantPermissions: {
                read: true,
                create: true,
                update: true,
                delete: true,
              },
            },
          ],
        },
        ...rest,
      ];
      await migrate(runQuery, newSchema);
    });

    it('user can read himself', async () => {
      const user = fixtures.User.vanilla;

      assert.deepEqual(await runQuery(`
        {
          userById(id: "${user.id}") {
            id
          }
        }`, {}, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(fixtures.User.creator.id),
          },
        }), {
          data: {
            userById: null,
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
          userById(id: "${user.id}") {
            id
          }
        }
      `, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
          },
        },
      });
    });

    it('can not to do stuff to microposts of other users', async () => {
      const user = fixtures.User.vanilla;
      const micropost = fixtures.Micropost.creator[0];

      assert.deepEqual(await runQuery(`
        {
          micropostById(id: "${micropost.id}") {
            id,
          }
        }
      `, {}, {
        credentials: {
          isAdimn: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          micropostById: null,
        },
        errors: [
          {
            message: 'User lacks permissions to read records of type Micropost',
          },
        ],
      });
    });

    it('can read own microposts', async () => {
      const user = fixtures.User.vanilla;
      const micropost = fixtures.Micropost.vanilla[0];

      assert.deepEqual(await runQuery(`
        {
          micropostById(id: "${micropost.id}") {
            id,
            author {
              id
            }
          }
        }
      `, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          micropostById: {
            id: micropost.id,
            author: {
              id: user.id,
            },
          },
        },
      });

      assert.deepEqual(await runQuery(`
        {
          userById(id: "${user.id}") {
            id,
            microposts(orderBy: {field: "createdAt"}, first: 1)  {
              nodes {
                id
              }
            }
          }
        }
      `, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
            microposts: {
              nodes: [
                {
                  id: micropost.id,
                },
              ],
            },
          },
        },
      });
    });

    it('can create оr update microposts only with self as user', async () => {
      const user = fixtures.User.vanilla;

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
        input: {
          clientMutationId: '',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
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
        input: {
          clientMutationId: '',
          author: user.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      });

      assert.deepEqual(result, {
        data: {
          createMicropost: {
            changedMicropost: {
              id: result.data.createMicropost.changedMicropost.id,
              author: {
                id: user.id,
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
        input: {
          clientMutationId: '',
          id: micropostID,
          author: fixtures.User.creator.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
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
        input: {
          clientMutationId: '',
          id: micropostID,
          text: 'foo',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          updateMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id: user.id,
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
        input: {
          id: micropostID,
          text: 'foo',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
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
        input: {
          id: micropostID,
          text: 'foozz',
          author: user.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          replaceMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id: user.id,
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
        input: {
          clientMutationId: '',
          id: micropostID,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          deleteMicropost: {
            changedMicropost: {
              id: micropostID,
              author: {
                id: user.id,
              },
            },
          },
        },
      });
    });

    it('can not read posts of other users through connections', async () => {
      const user = fixtures.User.vanilla;

      const permission = await createFixture(runQuery, 'ReindexPermission', {
        type: typesByName.User,
        read: true,
      }, 'id', {
        clearContext: true,
      });

      assert.deepEqual(await runQuery(`
        {
          userById(id: "${user.id}") {
            id,
            microposts {
              nodes {
                id
              }
            }
          }
        }
      `, {}, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User.creator.id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
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

      await deleteFixture(runQuery, 'ReindexPermission', permission.id, {
        clearContext: true,
      });
    });
  });
});
