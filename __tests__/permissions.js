import { get, omit } from 'lodash';
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
  getTypesByName,
  createFixture,
  deleteFixture,
} from '../test/testAppUtils';

import assert from '../test/assert';

describe('Permissions', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let runQuery;
  let typesByName;

  const fixtures = {
    User: {},
    Micropost: {},
  };

  before(async function () {
    await createTestApp(hostname);
    db = await getDB(hostname);
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
          printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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
      const rest = TEST_SCHEMA.filter((type) => type.name !== 'Micropost');
      const newSchema = [
        {
          ...micropost,
          permissions: [
            {
              path: ['author'],
              read: true,
              create: true,
              update: true,
              delete: true,
            },
            {
              path: ['favoritedBy'],
              read: true,
              create: true,
              update: true,
              delete: true,
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
          printErrors: false,
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
        printErrors: false,
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
      }, 'reading by id');

      assert.deepEqual(await runQuery(`
        {
          userById(id: "${user.id}") {
            id,
            microposts(orderBy: CREATED_AT_ASC, first: 1)  {
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
      }, 'reading via connection');
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
        printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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
        printErrors: false,
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

    if (!process.env.DATABASE_TYPE ||
        process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
      it('works with many to many', async () => {
        const user = fixtures.User.vanilla;
        const micropost = fixtures.Micropost.creator[0];

        await runQuery(`
          mutation favorite($input: _MicropostUserFavoritesConnectionInput!) {
            addMicropostToUserFavorites(input: $input) {
              changedUser {
                id
              },
              changedMicropost {
                id
              }
            }
          }
        `, {
          input: {
            micropostId: micropost.id,
            userId: user.id,
          },
        });

        const result = await runQuery(`
          {
            micropostById(id: "${micropost.id}") {
              id
            }
          }
        `, {
          credentials: {
            isAdmin: false,
            userID: fromReindexID(user.id),
          },
        });

        assert.deepEqual(result, {
          data: {
            micropostById: {
              id: micropost.id,
            },
          },
        });

        await runQuery(`
          mutation unfavorite(
            $input: _MicropostUserFavoritesConnectionInput!
          ) {
            removeMicropostFromUserFavorites(input: $input) {
              changedUser {
                id
              },
              changedMicropost {
                id
              }
            }
          }
        `, {
          input: {
            micropostId: micropost.id,
            userId: user.id,
          },
        });
      });

      describe('works with distant paths', () => {
        let author;
        let friend;
        let micropost;

        before(async () => {
          author = fixtures.User.vanilla;
          friend = fixtures.User.creator;
          micropost = fixtures.Micropost.vanilla[0];

          const schema = (await db.getTypes())
            .map((type) => omit(type, ['id', '_id']));

          const micropostType = schema.find(
            (type) => type.name === 'Micropost'
          );
          const userType = schema.find(
            (type) => type.name === 'User'
          );
          const rest = schema.filter(
            (type) => !(['Micropost', 'User'].includes(type.name))
          );
          const newSchema = [
            ...rest,
            {
              ...micropostType,
              fields: [
                ...micropostType.fields,
                {
                  name: 'comments',
                  type: 'Connection',
                  ofType: 'Comment',
                  reverseName: 'micropost',
                },
              ],
              permissions: [
                ...micropostType.permissions,
                {
                  path: ['author', 'friends'],
                  read: true,
                },
              ],
            },
            {
              ...userType,
              fields: [
                ...userType.fields.filter((field) =>
                  !(['credentials', 'permissions'].includes(field.name)
                )),
                {
                  name: 'ownComments',
                  type: 'Connection',
                  ofType: 'Comment',
                  reverseName: 'author',
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
                },
                {
                  name: 'author',
                  type: 'User',
                  reverseName: 'ownComments',
                },
                {
                  name: 'micropost',
                  type: 'Micropost',
                  reverseName: 'comments',
                },
              ],
              permissions: [
                {
                  path: ['author'],
                  read: true,
                  create: true,
                  update: true,
                  delete: true,
                },
                {
                  path: ['micropost', 'author'],
                  read: true,
                  create: true,
                  update: true,
                  delete: true,
                },
                {
                  path: ['micropost', 'author', 'friends'],
                  create: true,
                  read: true,
                },
              ],
            },
          ];
          await migrate(runQuery, newSchema);

          await runQuery(`
            mutation friend($input: _UserFriendsConnectionInput!) {
              addUserToUserFriends(input: $input) {
                clientMutationId
              }
            }
          `, {
            input: {
              user1Id: author.id,
              user2Id: friend.id,
            },
          });
        });

        let authorComment;
        let friendComment;

        it('author and friend can create comment', async () => {
          const query = `
            mutation addComment($input: _CreateCommentInput!) {
              createComment(input: $input) {
                changedComment {
                  id,
                  text
                  author {
                    id
                  }
                  micropost {
                    id
                  }
                }
              }
            }
          `;

          const authorCommentResult = await runQuery(query, {
            input: {
              text: 'I am awesome!',
              author: author.id,
              micropost: micropost.id,
            },
          }, {
            credentials: {
              userID: fromReindexID(author.id),
            },
          });

          const authorCommentId = get(authorCommentResult, [
            'data', 'createComment', 'changedComment', 'id',
          ]);

          assert.deepEqual(authorCommentResult, {
            data: {
              createComment: {
                changedComment: {
                  id: authorCommentId,
                  text: 'I am awesome!',
                  author: {
                    id: author.id,
                  },
                  micropost: {
                    id: micropost.id,
                  },
                },
              },
            },
          });

          authorComment = authorCommentResult.data.createComment.changedComment;

          const friendCommentResult = await runQuery(query, {
            input: {
              text: 'Yes you are awesome, good sir!',
              author: friend.id,
              micropost: micropost.id,
            },
          }, {
            credentials: {
              userID: fromReindexID(friend.id),
            },
          });

          const friendCommentId = get(friendCommentResult, [
            'data', 'createComment', 'changedComment', 'id',
          ]);

          assert.deepEqual(friendCommentResult, {
            data: {
              createComment: {
                changedComment: {
                  id: friendCommentId,
                  text: 'Yes you are awesome, good sir!',
                  author: {
                    id: friend.id,
                  },
                  micropost: {
                    id: micropost.id,
                  },
                },
              },
            },
          });

          friendComment = friendCommentResult.data.createComment.changedComment;
        });


        it('author and friend can read comments via connection', async () => {
          const query = `
            query($id: ID!){
              micropostById(id: $id) {
                id,
                comments {
                  count,
                  nodes {
                    text
                  }
                }
              }
            }
          `;

          const ownerResult = await runQuery(query, {
            id: micropost.id,
          }, {
            credentials: {
              userID: fromReindexID(author.id),
            },
          });

          assert.deepEqual(ownerResult, {
            data: {
              micropostById: {
                id: micropost.id,
                comments: {
                  count: 2,
                  nodes: [
                    {
                      text: 'I am awesome!',
                    },
                    {
                      text: 'Yes you are awesome, good sir!',
                    },
                  ],
                },
              },
            },
          });

          const friendResult = await runQuery(query, {
            id: micropost.id,
          }, {
            credentials: {
              userID: fromReindexID(friend.id),
            },
          });

          assert.deepEqual(ownerResult, friendResult);
        });

        it('author and friend can read comment directly', async () => {
          const query = `
            query($id: ID!) {
              commentById(id: $id) {
                id
              }
            }
          `;

          assert.deepEqual(await runQuery(query, {
            id: authorComment.id,
          }, {
            credentials: {
              userID: fromReindexID(author.id),
            },
          }), {
            data: {
              commentById: {
                id: authorComment.id,
              },
            },
          });

          assert.deepEqual(await runQuery(query, {
            id: authorComment.id,
          }, {
            credentials: {
              userID: fromReindexID(friend.id),
            },
          }), {
            data: {
              commentById: {
                id: authorComment.id,
              },
            },
          });

          assert.deepEqual(await runQuery(query, {
            id: authorComment.id,
          }, {
            credentials: {
              userID: fromReindexID(fixtures.User.banRead.id),
            },
            printErrors: false,
          }), {
            data: {
              commentById: null,
            },
            errors: [
              {
                message:
'User lacks permissions to read records of type Comment',
              },
            ],
          });
        });

        it('can delete own comments, but not author\'s', async () => {
          const query = `
            mutation($input: _DeleteCommentInput!) {
              deleteComment(input: $input) {
                id
              }
            }
          `;

          assert.deepEqual(await runQuery(query, {
            input: {
              id: authorComment.id,
            },
          }, {
            credentials: {
              userID: fromReindexID(friend.id),
            },
            printErrors: false,
          }), {
            data: {
              deleteComment: null,
            },
            errors: [
              {
                message:
'User lacks permissions to delete records of type Comment',
              },
            ],
          });

          assert.deepEqual(await runQuery(query, {
            input: {
              id: friendComment.id,
            },
          }, {
            credentials: {
              userID: fromReindexID(friend.id),
            },
          }), {
            data: {
              deleteComment: {
                id: friendComment.id,
              },
            },
          });
        });
      });
    }
  });
});
