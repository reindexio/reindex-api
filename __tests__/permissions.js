import { get } from 'lodash';
import uuid from 'uuid';

import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import DatabaseTypes from '../db/DatabaseTypes';
import { fromReindexID } from '../graphQL/builtins/ReindexID';

import { TEST_SCHEMA } from '../test/fixtures';
import {
  makeRunQuery,
  migrate,
  createTestApp,
  createFixture,
  deleteFixture,
  augmentSchema,
} from '../test/testAppUtils';

import assert from '../test/assert';

describe('Permissions', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let runQuery;

  const fixtures = {
    User: {},
    Micropost: {},
  };

  before(async function () {
    await createTestApp(hostname);
    db = await getDB(hostname);
    runQuery = makeRunQuery(db);

    for (let i = 0; i < 5; i++) {
      fixtures.User[i] = await createFixture(runQuery, 'User', {
        handle: `user-${i}`,
      }, 'id, handle');

      fixtures.Micropost[i] = [];
      for (let m = 0; m < 5; m++) {
        fixtures.Micropost[i].push(
          await createFixture(runQuery, 'Micropost', {
            author: fixtures.User[i].id,
            text: `micropost-${i}-${m}`,
            createdAt: '@TIMESTAMP',
          }, `id, text, createdAt`)
        );
      }
    }
  });

  after(async function () {
    await db.close();
    await deleteApp(hostname);
  });

  describe('read permissions', () => {
    before(async () => {
      await migrate(runQuery, augmentSchema(
        TEST_SCHEMA,
        [
          {
            name: 'User',
            permissions: [
              {
                grantee: 'EVERYONE',
                read: true,
              },
            ],
          },
          {
            name: 'Micropost',
            permissions: [
              {
                grantee: 'AUTHENTICATED',
                read: true,
              },
            ],
          },
          {
            kind: 'OBJECT',
            name: 'EmptyPermissions',
            interfaces: ['Node'],
            fields: [
              {
                name: 'id',
                type: 'ID',
                nonNull: true,
                unique: true,
              },
            ],
          },
        ],
      ), true);
    });

    after(async () => {
      await migrate(runQuery, TEST_SCHEMA, true);
    });

    it('grants wildcard permission with empty permissions', async () => {
      const emptyPermissionResult = await runQuery(`
        mutation {
          createEmptyPermissions(input: {}) {
            id,
          }
        }`, {}, {
          credentials: {
            isAdmin: false,
            userID: null,
          },
        },
      );

      assert.deepEqual(emptyPermissionResult, {
        data: {
          createEmptyPermissions: {
            id: get(emptyPermissionResult, [
              'data',
              'createEmptyPermissions',
              'id',
            ]),
          },
        },
      });

      const emptyPermission = emptyPermissionResult.data.createEmptyPermissions;

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          emptyPermissionsById(id: $id) {
            id,
          }
        }
      `, {
        id: emptyPermission.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
      }), {
        data: {
          emptyPermissionsById: emptyPermission,
        },
      }, 'wildcard grants to anonymous');

      assert.deepEqual(await runQuery(`
        mutation($id: ID!) {
          deleteEmptyPermissions(input: { id: $id }) {
            id
          }
        }`, {
          id: emptyPermission.id,
        }, {
          credentials: {
            isAdmin: false,
            userID: null,
          },
        },
      ), {
        data: {
          deleteEmptyPermissions: emptyPermission,
        },
      });
    });

    it('checks permissions on gets, lists and node', async () => {
      const user = fixtures.User[0];
      const micropost = fixtures.Micropost[0][0];

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          userById(id: $id) {
            id,
            handle
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          userById: user,
        },
      }, 'non-anonymous can read user');

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          userById(id: $id) {
            id,
            handle
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
      }), {
        data: {
          userById: user,
        },
      }, 'anonymous can read user');

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          micropostById(id: $id) {
            id
            text
            createdAt
          }
        }
      `, {
        id: micropost.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          micropostById: micropost,
        },
      }, 'non-anonymous can read micropost');

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          micropostById(id: $id) {
            id
            text
            createdAt
          }
        }
      `, {
        id: micropost.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          micropostById: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to read nodes of type `Micropost`.'
            ),
          },
        ],
      }, 'anonymous can not read micropost');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts {
              count
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
          viewer: {
            allMicroposts: {
              count: 25,
            },
          },
        },
      }, 'non-anonymous can read micropost listings');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts {
              count
            }
          }
        }
      `, {}, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          viewer: {
            allMicroposts: null,
          },
        },
        errors: [
          {
            message: (
              'User lacks permissions to read nodes of type `Micropost`.'
            ),
          },
        ],
      }, 'anonymous can not read micropost listings');
    });

    it('checks permissions on connection boundaries', async () => {
      const user = fixtures.User[0];

      assert.deepEqual(await runQuery(`
        query($id: ID!){
          userById(id: $id) {
            id,
            handle,
            microposts {
              count
            }
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          userById: {
            ...user,
            microposts: {
              count: 5,
            },
          },
        },
      }, 'non-anonymous can read microposts');

      assert.deepEqual(await runQuery(`
        query($id: ID!){
          userById(id: $id) {
            id,
            handle,
            microposts {
              count
            }
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          userById: {
            ...user,
            microposts: null,
          },
        },
        errors: [
          {
            message: (
              'User lacks permissions to read nodes of type `Micropost`.'
            ),
          },
        ],
      }, 'anonymous can not read microposts');
    });
  });

  describe('user credentials', () => {
    let user;
    before(async () => {
      await migrate(runQuery, augmentSchema(
        TEST_SCHEMA,
        [
          {
            name: 'User',
            permissions: [
              {
                grantee: 'EVERYONE',
                read: true,
                update: true,
              },
            ],
          },
        ],
      ), true);

      user = await createFixture(runQuery, 'User', {
        handle: `user-with-credentials`,
        credentials: {
          github: {
            id: '1',
            accessToken: 'scoodley-pooping',
          },
        },
      }, 'id, handle, credentials { github { id, accessToken } }');
    });

    after(async () => {
      await deleteFixture(runQuery, 'User', user.id);
      await migrate(runQuery, TEST_SCHEMA, true);
    });

    it('only user himself can read his access token', async () => {
      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          userById(id: $id) {
            id,
            handle,
            credentials {
              github {
                id,
                accessToken,
              }
            }
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          userById: user,
        },
      });

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          userById(id: $id) {
            id,
            handle,
            credentials {
              github {
                id,
                accessToken,
              }
            }
          }
        }
      `, {
        id: user.id,
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(fixtures.User[0].id),
        },
      }), {
        data: {
          userById: {
            id: user.id,
            handle: user.handle,
            credentials: {
              github: null,
            },
          },
        },
        errors: [
          {
            message: (
              'User lacks permissions to read nodes of type `User` with' +
              ' fields `credentials.github`.'
            ),
          },
        ],
      });
    });

    it('can not update credentials even if you have permissions', async () => {
      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateUserInput!) {
          updateUser(input: $input) {
            id
          }
        }
      `, {
        input: {
          id: user.id,
          credentials: {
            github: {
              id: 'imma personating',
              accessToken: 'imma injecting',
            },
          },
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
        printErrors: false,
      }), {
        data: {
          updateUser: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `User` with' +
              ' fields `credentials`.'
            ),
          },
        ],
      });
    });
  });

  describe('mutation permissions', () => {
    before(async () => {
      await migrate(runQuery, augmentSchema(
        TEST_SCHEMA,
        [
          {
            name: 'User',
            permissions: [
              {
                grantee: 'AUTHENTICATED',
                update: true,
                permittedFields: [
                  'microposts',
                  'favorites',
                  'following',
                  'followers',
                ],
              },
              {
                grantee: 'EVERYONE',
                read: true,
              },
            ],
          },
          {
            name: 'Micropost',
            permissions: [
              {
                grantee: 'EVERYONE',
                read: true,
                create: true,
                update: true,
                delete: true,
              },
            ],
          },
          {
            kind: 'OBJECT',
            name: 'Test',
            interfaces: ['Node'],
            fields: [
              {
                name: 'id',
                type: 'ID',
                nonNull: true,
                unique: true,
              },
              {
                name: 'test',
                type: 'String',
              },
            ],
            permissions: [
              {
                grantee: 'AUTHENTICATED',
                read: true,
                create: true,
                update: true,
                delete: true,
              },
            ],
          },
        ],
      ), true);
    });

    after(async () => {
      await migrate(runQuery, TEST_SCHEMA, true);
    });

    it('requires permissions to do mutations', async () => {
      const user = fixtures.User[0];

      assert.deepEqual(await runQuery(`
        mutation($input: _CreateTestInput!) {
          createTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          test: '1234',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          createTest: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to create nodes of type `Test` ' +
              'with fields `test`.'
            ),
          },
        ],
      }, 'anonymous can not create');

      const testResult = await runQuery(`
        mutation($input: _CreateTestInput!) {
          createTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }`, {
          input: {
            test: '1234',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(user.id),
          },
        },
      );

      assert.deepEqual(testResult, {
        data: {
          createTest: {
            changedTest: {
              id: get(testResult, [
                'data',
                'createTest',
                'changedTest',
                'id',
              ]),
              test: '1234',
            },
          },
        },
      });

      const test = testResult.data.createTest.changedTest;

      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateTestInput!) {
          updateTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
          test: '2345',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: false,
        },
        printErrors: false,
      }), {
        data: {
          updateTest: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `Test` ' +
              'with fields `test`.'
            ),
          },
        ],
      }, 'anonymous can not update');

      assert.deepEqual(await runQuery(`
        mutation($input: _ReplaceTestInput!) {
          replaceTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
          test: '2345',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          replaceTest: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to replace nodes of type `Test` ' +
              'with fields `id`, `test`.'
            ),
          },
        ],
      }, 'anonymous can not replace');

      assert.deepEqual(await runQuery(`
        mutation($input: _DeleteTestInput!) {
          deleteTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          deleteTest: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to delete nodes of type `Test`.'
            ),
          },
        ],
      }, 'anonymous can not delete');

      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateTestInput!) {
          updateTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
          test: '2345',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          updateTest: {
            changedTest: {
              id: test.id,
              test: '2345',
            },
          },
        },
      }, 'non-anonymous can update');

      assert.deepEqual(await runQuery(`
        mutation($input: _ReplaceTestInput!) {
          replaceTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
          test: '3456',
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          replaceTest: {
            changedTest: {
              id: test.id,
              test: '3456',
            },
          },
        },
      }, 'non-anonymous can replace');

      assert.deepEqual(await runQuery(`
        mutation($input: _DeleteTestInput!) {
          deleteTest(input: $input) {
            changedTest {
              id
              test
            }
          }
        }
      `, {
        input: {
          id: test.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: fromReindexID(user.id),
        },
      }), {
        data: {
          deleteTest: {
            changedTest: {
              id: test.id,
              test: '3456',
            },
          },
        },
      }, 'non-anonymous can delete');
    });

    it('requires related permissions', async () => {
      const user = fixtures.User[0];
      const user2 = fixtures.User[1];
      const micropost = fixtures.Micropost[0][0];

      assert.deepEqual(await runQuery(`
        mutation($input: _CreateMicropostInput!) {
          createMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          text: 'Test',
          author: user.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          createMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `User` ' +
              'with fields `microposts`.'
            ),
          },
        ],
      }, 'anonymous can not create without permissions to Connection');

      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateMicropostInput!) {
          updateMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          id: micropost.id,
          text: 'Test',
          author: user2.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          updateMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `User` ' +
              'with fields `microposts`.'
            ),
          },
        ],
      }, 'anonymous can not update author without permissions to Connection');

      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateMicropostInput!) {
          updateMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          id: micropost.id,
          text: 'New Text',
          author: user.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
      }), {
        data: {
          updateMicropost: {
            changedMicropost: {
              id: micropost.id,
              text: 'New Text',
              author: {
                id: user.id,
              },
            },
          },
        },
      }, 'anonymous can update without changing author');

      assert.deepEqual(await runQuery(`
        mutation($input: _UpdateMicropostInput!) {
          updateMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          id: micropost.id,
          text: micropost.text,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
      }), {
        data: {
          updateMicropost: {
            changedMicropost: {
              id: micropost.id,
              text: micropost.text,
              author: {
                id: user.id,
              },
            },
          },
        },
      }, 'anonymous can update without changing author (omit field)');

      assert.deepEqual(await runQuery(`
        mutation($input: _ReplaceMicropostInput!) {
          replaceMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          id: micropost.id,
          text: 'Test',
          author: null,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          replaceMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `User` ' +
              'with fields `microposts`.'
            ),
          },
        ],
      }, 'anonymous can not replace author without permissions to Connection');

      assert.deepEqual(await runQuery(`
        mutation($input: _DeleteMicropostInput!) {
          deleteMicropost(input: $input) {
            changedMicropost {
              id,
              text
              author {
                id
              }
            }
          }
        }
      `, {
        input: {
          id: micropost.id,
        },
      }, {
        credentials: {
          isAdmin: false,
          userID: null,
        },
        printErrors: false,
      }), {
        data: {
          deleteMicropost: null,
        },
        errors: [
          {
            message: (
              'User lacks permissions to update nodes of type `User` ' +
              'with fields `microposts`.'
            ),
          },
        ],
      }, 'anonymous can not delete without permissions to Connection');
    });

    if (!process.env.DATABASE_TYPE ||
        process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
      it('works with many-to-many', async () => {
        const user1 = fixtures.User[0];
        const user2 = fixtures.User[1];

        assert.deepEqual(await runQuery(`
          mutation($input: _UserFollowersConnectionInput!) {
            addUserToUserFollowers(input: $input) {
              changedFollowersUser {
                id
              }
              changedFollowingUser {
                id
              }
            }
          }
        `, {
          input: {
            followersId: user1.id,
            followingId: user2.id,
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: null,
          },
          printErrors: false,
        }), {
          data: {
            addUserToUserFollowers: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to update nodes of type `User` ' +
                'with fields `following`.\nUser lacks permissions to ' +
                'update nodes of type `User` with fields `followers`.'
              ),
            },
          ],
        }, 'anonymous can not follow');

        assert.deepEqual(await runQuery(`
          mutation($input: _UserFollowersConnectionInput!) {
            addUserToUserFollowers(input: $input) {
              changedFollowersUser {
                id
              }
              changedFollowingUser {
                id
              }
            }
          }
        `, {
          input: {
            followersId: user1.id,
            followingId: user2.id,
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(user1.id),
          },
          printErrors: false,
        }), {
          data: {
            addUserToUserFollowers: {
              changedFollowersUser: {
                id: user1.id,
              },
              changedFollowingUser: {
                id: user2.id,
              },
            },
          },
        }, 'non-anonymous can follow');
      });
    }
  });


  if (!process.env.DATABASE_TYPE ||
      process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
    describe('connection permissions', () => {
      before(async () => {
        await migrate(runQuery, augmentSchema(
          TEST_SCHEMA,
          [
            {
              name: 'User',
              fields: [
                {
                  name: 'comments',
                  type: 'Connection',
                  ofType: 'Comment',
                  reverseName: 'author',
                },
              ],
              permissions: [
                {
                  grantee: 'USER',
                  userPath: ['id'],
                  read: true,
                  update: true,
                  permittedFields: [
                    'handle',
                    'email',
                    'friends',
                    'microposts',
                    'comments',
                  ],
                },
                {
                  grantee: 'USER',
                  userPath: ['friends'],
                  read: true,
                },
              ],
            },
            {
              name: 'Micropost',
              fields: [
                {
                  name: 'comments',
                  type: 'Connection',
                  ofType: 'Comment',
                  reverseName: 'micropost',
                },
              ],
              permissions: [
                {
                  grantee: 'AUTHENTICATED',
                  create: true,
                },
                {
                  grantee: 'USER',
                  userPath: ['author'],
                  read: true,
                  update: true,
                  delete: true,
                },
                {
                  grantee: 'USER',
                  userPath: ['author', 'friends'],
                  read: true,
                  update: true,
                  permittedFields: ['comments'],
                },
              ],
            },
            {
              kind: 'OBJECT',
              name: 'Comment',
              interfaces: ['Node'],
              fields: [
                {
                  name: 'id',
                  type: 'ID',
                  nonNull: true,
                  unique: true,
                },
                {
                  name: 'text',
                  type: 'String',
                  orderable: true,
                },
                {
                  name: 'createdAt',
                  type: 'DateTime',
                  orderable: true,
                },
                {
                  name: 'author',
                  type: 'User',
                  reverseName: 'comments',
                },
                {
                  name: 'micropost',
                  type: 'Micropost',
                  reverseName: 'comments',
                },
              ],
              permissions: [
                {
                  grantee: 'AUTHENTICATED',
                  create: true,
                },
                {
                  grantee: 'USER',
                  userPath: ['author'],
                  read: true,
                  update: true,
                  delete: true,
                },
                {
                  grantee: 'USER',
                  userPath: ['micropost', 'author'],
                  read: true,
                  delete: true,
                },
                {
                  grantee: 'USER',
                  userPath: ['micropost', 'author', 'friends'],
                  read: true,
                },
              ],
            },
          ],
        ), true);

        await runQuery(`
          mutation($input: _UserFriendsConnectionInput!) {
            addUserToUserFriends(input: $input) {
              clientMutationId
            }
          }
        `, {
          input: {
            user1Id: fixtures.User[0].id,
            user2Id: fixtures.User[1].id,
          },
        });

        await runQuery(`
          mutation($input: _UserFriendsConnectionInput!) {
            addUserToUserFriends(input: $input) {
              clientMutationId
            }
          }
        `, {
          input: {
            user1Id: fixtures.User[0].id,
            user2Id: fixtures.User[2].id,
          },
        });
      });

      after(async () => {
        await migrate(runQuery, TEST_SCHEMA, true);
      });

      it('user can read and update himself, friends can read', async () => {
        const author = fixtures.User[0];
        const friend1 = fixtures.User[1];
        const stranger = fixtures.User[3];

        assert.deepEqual(await runQuery(`
          mutation($input: _UpdateUserInput!) {
            updateUser(input: $input) {
              id
            }
          }
        `, {
          input: {
            id: author.id,
            email: 'newemail@example.com',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
        }), {
          data: {
            updateUser: {
              id: author.id,
            },
          },
        }, 'self can update');

        assert.deepEqual(await runQuery(`
          mutation($input: _UpdateUserInput!) {
            updateUser(input: $input) {
              id
            }
          }
        `, {
          input: {
            id: author.id,
            email: 'other@example.com',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend1.id),
          },
          printErrors: false,
        }), {
          data: {
            updateUser: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to update nodes of type `User` ' +
                'with fields `email`.'
              ),
            },
          ],
        }, 'friend can not update');

        assert.deepEqual(await runQuery(`
          query($id: ID!) {
            userById(id: $id) {
              id
            }
          }
        `, {
          id: author.id,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend1.id),
          },
        }), {
          data: {
            userById: {
              id: author.id,
            },
          },
        }, 'friend can read');

        assert.deepEqual(await runQuery(`
          query($id: ID!) {
            userById(id: $id) {
              id
            }
          }
        `, {
          id: author.id,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(stranger.id),
          },
          printErrors: false,
        }), {
          data: {
            userById: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to read nodes of type `User`.'
              ),
            },
          ],
        }, 'friend can read');
      });

      it('can do stuff to own microposts, friends can read', async () => {
        const author = fixtures.User[0];
        const friend1 = fixtures.User[1];
        const stranger = fixtures.User[3];

        assert.deepEqual(await runQuery(`
          mutation($input: _CreateMicropostInput!) {
            createMicropost(input: $input) {
              id
            }
          }
        `, {
          input: {
            author: friend1.id,
            text: 'Some text',
            createdAt: '@TIMESTAMP',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
          printErrors: false,
        }), {
          data: {
            createMicropost: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to update nodes of type `User` ' +
                'with fields `microposts`.'
              ),
            },
          ],
        }, 'can not create for other users');

        const micropostResult = await runQuery(`
          mutation($input: _CreateMicropostInput!) {
            createMicropost(input: $input) {
              id
            }
          }
        `, {
          input: {
            author: author.id,
            text: 'Some text',
            createdAt: '@TIMESTAMP',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
        });

        assert.deepEqual(micropostResult, {
          data: {
            createMicropost: {
              id: get(micropostResult, ['data', 'createMicropost', 'id']),
            },
          },
        });

        const micropostId = micropostResult.data.createMicropost.id;

        assert.deepEqual(await runQuery(`
          query($id: ID!) {
            micropostById(id: $id) {
              id
            }
          }
        `, {
          id: micropostId,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend1.id),
          },
        }), {
          data: {
            micropostById: {
              id: micropostId,
            },
          },
        }, 'friend can read micropost');

        assert.deepEqual(await runQuery(`
          query($id: ID!) {
            micropostById(id: $id) {
              id
            }
          }
        `, {
          id: micropostId,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(stranger.id),
          },
          printErrors: false,
        }), {
          data: {
            micropostById: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to read nodes of type `Micropost`.'
              ),
            },
          ],
        }, 'stranger can not read micropost');

        assert.deepEqual(await runQuery(`
          mutation($input: _DeleteMicropostInput!) {
            deleteMicropost(input: $input) {
              id
            }
          }
        `, {
          input: {
            id: micropostId,
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend1.id),
          },
          printErrors: false,
        }), {
          data: {
            deleteMicropost: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to delete nodes of type ' +
                '`Micropost`.\nUser lacks permissions to update nodes ' +
                'of type `User` with fields `microposts`.'
              ),
            },
          ],
        }, 'friend can not delete micropost');

        assert.deepEqual(await runQuery(`
          mutation($input: _DeleteMicropostInput!) {
            deleteMicropost(input: $input) {
              id
            }
          }
        `, {
          input: {
            id: micropostId,
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
        }), {
          data: {
            deleteMicropost: {
              id: micropostId,
            },
          },
        }, 'author can delete own micropost');
      });

      it('can comment on own and friends microposts', async () => {
        const author = fixtures.User[0];
        const micropost = fixtures.Micropost[0][0];
        const friend1 = fixtures.User[1];
        const friend2 = fixtures.User[2];
        const stranger = fixtures.User[3];

        assert.deepEqual(await runQuery(`
          mutation($input: _CreateCommentInput!) {
            createComment(input: $input) {
              changedComment {
                text
              }
            }
          }
        `, {
          input: {
            micropost: micropost.id,
            author: stranger.id,
            text: 'test',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(stranger.id),
          },
          printErrors: false,
        }), {
          data: {
            createComment: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to update nodes of type `Micropost` ' +
                'with fields `comments`.'
              ),
            },
          ],
        }, 'stranger can not comment');

        assert.deepEqual(await runQuery(`
          mutation($input: _CreateCommentInput!) {
            createComment(input: $input) {
              changedComment {
                text
              }
            }
          }
        `, {
          input: {
            micropost: micropost.id,
            author: stranger.id,
            text: 'test',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
          printErrors: false,
        }), {
          data: {
            createComment: null,
          },
          errors: [
            {
              message: (
                'User lacks permissions to update nodes of type `User` ' +
                'with fields `comments`.'
              ),
            },
          ],
        }, 'author can not comment through other user');

        assert.deepEqual(await runQuery(`
          mutation($input: _CreateCommentInput!) {
            createComment(input: $input) {
              changedComment {
                text
              }
            }
          }
        `, {
          input: {
            micropost: micropost.id,
            author: author.id,
            text: 'test',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
        }), {
          data: {
            createComment: {
              changedComment: {
                text: 'test',
              },
            },
          },
        }, 'author can comment');

        assert.deepEqual(await runQuery(`
          mutation($input: _CreateCommentInput!) {
            createComment(input: $input) {
              changedComment {
                text
              }
            }
          }
        `, {
          input: {
            micropost: micropost.id,
            author: friend1.id,
            text: 'test',
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend1.id),
          },
        }), {
          data: {
            createComment: {
              changedComment: {
                text: 'test',
              },
            },
          },
        }, 'friend can comment');

        assert.deepEqual(await runQuery(`
          query($id: ID!) {
            micropostById(id: $id) {
              comments {
                count
              }
            }
          }
        `, {
          id: micropost.id,
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(friend2.id),
          },
        }), {
          data: {
            micropostById: {
              comments: {
                count: 2,
              },
            },
          },
        }, 'other friend can read all comments');

        assert.deepEqual(await runQuery(`
          mutation($input: _DeleteMicropostInput!) {
            deleteMicropost(input: $input) {
              id
            }
          }
        `, {
          input: {
            id: micropost.id,
          },
        }, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(author.id),
          },
          printErrors: false,
        }), {
          data: {
            deleteMicropost: null,
          },
          errors: [
            {
              message: (
                'User lacks permission to delete nodes of type ' +
                '`Micropost`. Node is connected to node(s) of type ' +
                '`Comment` through connection `comments`.'
              ),
            },
          ],
        }, 'author can not delete own micropost if it has comments');
      });
    });
  }
});
