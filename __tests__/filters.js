import uuid from 'uuid';
import { chain } from 'lodash';

import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import DatabaseTypes from '../db/DatabaseTypes';

import {
  makeRunQuery,
  createTestApp,
  createFixture,
} from '../test/testAppUtils';

import assert from '../test/assert';

describe('Filter Tests', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let runQuery;

  const fixtures = {
    User: {},
    Micropost: [],
  };

  before(async function() {
    await createTestApp(hostname);
    db = await getDB(hostname);
    runQuery = makeRunQuery(db);

    for (let i = 0; i < 5; i++) {
      fixtures.User[i] = await createFixture(runQuery, 'User', {
        handle: `user-${i}`,
        email: i % 2 === 0 ? `user-${i}@example.com` : null,
      }, 'id, handle, email');

      for (let m = 0; m < 5; m++) {
        fixtures.Micropost.push(
          await createFixture(runQuery, 'Micropost', {
            author: fixtures.User[i].id,
            text: `micropost-${i}-${m}`,
            createdAt: `2014-0${i + 1}-0${m + 1}`,
            mainCategory: {
              name: `category-${m % 3}`,
            },
            tags: [
              `tag-${m % 2}`,
              `tag-${m % 5}`,
            ],
          }, `id, text, createdAt, author { id } mainCategory { name } tags`)
        );
      }
    }

    // user with undefined email
    fixtures.User[5] = await createFixture(runQuery, 'User', {
      handle: 'user-5',
    }, 'id, handle, email');
  });

  after(async function () {
    await db.close();
    await deleteApp(hostname);
  });

  if (!process.env.DATABASE_TYPE ||
      process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
    it('filters in allNodes', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(
              first: 10,
              filter: [
                {
                  op: LT,
                  field: createdAt,
                  valueDateTime: "2014-02-01",
                }
              ],
              orderBy: CREATED_AT_DESC
            ) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  new Date(micropost.createdAt) <
                  new Date('2014-02-01')
                ))
                .sortBy((micropost) => new Date(micropost.createdAt))
                .reverse()
                .value()
                .slice(0, 10),
            },
          },
        },
      });

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          viewer {
            allMicroposts(first: 10, filter: [
              {
                op: EQ,
                field: author,
                valueID: $id
              }
            ], orderBy: CREATED_AT_DESC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `, {
        id: fixtures.User[0].id,
      }), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  micropost.author.id === fixtures.User[0].id
                ))
                .sortBy((micropost) => new Date(micropost.createdAt))
                .reverse()
                .value()
                .slice(0, 10),
            },
          },
        },
      });
    });

    it('filters in connections', async () => {
      const user = fixtures.User[0];
      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          userById(id: $id) {
            id
            handle
            email
            microposts(first: 10, filter: [
              {
                op: LT,
                field: createdAt,
                valueDateTime: "2014-02-01",
              }
            ]) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `, {
        id: user.id,
      }), {
        data: {
          userById: {
            ...user,
            microposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  micropost.author.id === user.id &&
                  (new Date(micropost.createdAt) <
                   new Date('2014-02-01'))
                ))
                .sortBy((micropost) => new Date(micropost.createdAt))
                .value()
                .slice(0, 10),
            },
          },
        },
      });
    });

    it('does not allow wrong filter inputs', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: NULL,
                field: email,
                valueString: "some@example.com",
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `, {}, {
        printErrors: false,
      }), {
        data: {
          viewer: {
            allUsers: null,
          },
        },
        errors: [
          {
            message: (
              'Invalid filter value for field `email` of type `String` ' +
              'with op `NULL`. Expected no values to be present.'
            ),
          },
        ],
      }, 'null with passed value');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: LT,
                field: email,
                valueString: "some@example.com",
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `, {}, {
        printErrors: false,
      }), {
        data: {
          viewer: {
            allUsers: null,
          },
        },
        errors: [
          {
            message: (
              'Invalid filter op `LT` for field email of type `String`. ' +
              'Allowed op values are: EQ, NEQ, NULL, NOTNULL.'
            ),
          },
        ],
      }, 'invalid op');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: EQ,
                field: email,
                valueDateTime: "2014-05-10",
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `, {}, {
        printErrors: false,
      }), {
        data: {
          viewer: {
            allUsers: null,
          },
        },
        errors: [
          {
            message: (
              'Invalid filter value for field `email` of type `String` ' +
              'with op `EQ`. Expected only `valueString` to be non-null.'
            ),
          },
        ],
      }, 'invalid value passed');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: EQ,
                field: email,
                valueString: "some@example.com",
                valueDateTime: "2014-05-10",
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `, {}, {
        printErrors: false,
      }), {
        data: {
          viewer: {
            allUsers: null,
          },
        },
        errors: [
          {
            message: (
              'Invalid filter value for field `email` of type `String` ' +
              'with op `EQ`. Expected only `valueString` to be non-null.'
            ),
          },
        ],
      }, 'more values passed');
    });

    it('ands multiple filters', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(
              first: 10,
              filter: [
                {
                  op: LTE,
                  field: createdAt,
                  valueDateTime: "2014-02-01",
                },
                {
                  op: GTE,
                  field: createdAt,
                  valueDateTime: "2014-02-03"
                }
              ],
              orderBy: CREATED_AT_DESC
            ) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  (new Date(micropost.createdAt) <= new Date('2014-02-01')) &&
                  (new Date(micropost.createdAt) >= new Date('2014-02-03'))
                ))
                .sortBy((micropost) => new Date(micropost.createdAt))
                .reverse()
                .value()
                .slice(0, 10),
            },
          },
        },
      });
    });

    it('filters by null or not-null', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: NULL,
                field: email,
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allUsers: {
              nodes: chain(fixtures.User)
                .values()
                .filter((user) => (
                  user.email === null ||
                  user.email === undefined
                ))
                .sortBy((user) => user.handle)
                .value(),
            },
          },
        },
      }, 'is null');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allUsers(filter: [
              {
                op: NOTNULL,
                field: email,
              },
            ], orderBy: HANDLE_ASC) {
              nodes {
                id
                handle
                email
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allUsers: {
              nodes: chain(fixtures.User)
                .values()
                .filter((user) => (
                  user.email !== null &&
                  user.email !== undefined
                ))
                .sortBy((user) => user.handle)
                .value(),
            },
          },
        },
      }, 'is not null');
    });

    it('filters by nested fields', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(first: 10, filter: [
              {
                op: EQ,
                field: mainCategory__name,
                valueString: "category-0",
              },
            ], orderBy: CREATED_AT_ASC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  micropost.mainCategory.name === 'category-0'
                ))
                .sortBy((micropost) => micropost.createdAt)
                .value()
                .slice(0, 10),
            },
          },
        },
      });
    });

    it('filters by lists', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(first: 10, filter: [
              {
                op: IN,
                field: tags,
                valueString: "tag-1",
              },
            ], orderBy: CREATED_AT_ASC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  micropost.tags.includes('tag-1')
                ))
                .sortBy((micropost) => micropost.createdAt)
                .value()
                .slice(0, 10),
            },
          },
        },
      }, 'includes');

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(first: 10, filter: [
              {
                op: NIN,
                field: tags,
                valueString: "tag-1",
              },
            ], orderBy: CREATED_AT_ASC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  !micropost.tags.includes('tag-1')
                ))
                .sortBy((micropost) => micropost.createdAt)
                .value()
                .slice(0, 10),
            },
          },
        },
      }, 'not includes');
    });

    it('filters by connections', async () => {
      const user = fixtures.User[0];
      const microposts = fixtures.Micropost.slice(0, 10);

      for (const micropost of microposts) {
        await runQuery(`
          mutation($userId: ID!, $micropostId: ID!) {
            addMicropostToUserFavorites(input: {
              userId: $userId,
              micropostId: $micropostId
            }) {
              clientMutationId
            }
          }
        `, {
          userId: user.id,
          micropostId: micropost.id,
        });
      }

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          viewer {
            allMicroposts(first: 100, filter: [
              {
                op: IN,
                field: favoritedBy,
                valueID: $id
              }
            ], orderBy: CREATED_AT_ASC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `, {
        id: user.id,
      }), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: microposts,
            },
          },
        },
      }, 'connection filtering includes');

      assert.deepEqual(await runQuery(`
        query($id: ID!) {
          viewer {
            allMicroposts(first: 10, filter: [
              {
                op: NIN,
                field: favoritedBy,
                valueID: $id
              }
            ], orderBy: CREATED_AT_ASC) {
              nodes {
                id
                text
                createdAt
                author {
                  id
                }
                mainCategory {
                  name
                }
                tags
              }
            }
          }
        }
      `, {
        id: user.id,
      }), {
        data: {
          viewer: {
            allMicroposts: {
              nodes: chain(fixtures.Micropost)
                .filter((micropost) => (
                  !microposts.find((otherMicropost) =>
                    otherMicropost.id === micropost.id
                  )
                ))
                .sortBy((micropost) => new Date(micropost.createdAt))
                .value()
                .slice(0, 10),
            },
          },
        },
      }, 'connection filtering not includes');
    });
  }
});
