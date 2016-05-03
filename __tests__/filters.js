import uuid from 'uuid';
import { chain, isEqual } from 'lodash';

import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import DatabaseTypes from '../db/DatabaseTypes';

import {
  makeRunQuery,
  createTestApp,
  createFixture,
  migrate,
  augmentSchema,
} from '../test/testAppUtils';
import { TEST_SCHEMA } from '../test/fixtures';

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
              createdAt: {
                lt: "2014-02-01",
              },
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
            allMicroposts(first: 10, author: {
              eq: $id
            }, orderBy: CREATED_AT_DESC) {
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
            microposts(first: 10, createdAt: {
              lt: "2014-02-01",
            }) {
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

    it('ands multiple filters', async () => {
      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(
              first: 10,
              createdAt: {
                lte: "2014-02-01",
                gte: "2014-02-03"
              },
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
            allUsers(email: {
              isNull: true,
            }, orderBy: HANDLE_ASC) {
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
            allUsers(email: {
              isNull: false,
            }, orderBy: HANDLE_ASC) {
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
            allMicroposts(first: 10, mainCategory__name: {
              eq: "category-0",
            }, orderBy: CREATED_AT_ASC) {
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
            allMicroposts(first: 10, tags: {
              includes: "tag-1",
            }, orderBy: CREATED_AT_ASC) {
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
            allMicroposts(first: 10, tags: {
              excludes: "tag-1",
            }, orderBy: CREATED_AT_ASC) {
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

      assert.deepEqual(await runQuery(`
        {
          viewer {
            allMicroposts(first: 10, tags: {
              eq: ["tag-0", "tag-0"],
            }, orderBy: CREATED_AT_ASC) {
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
                  isEqual(micropost.tags, ['tag-0', 'tag-0'])
                ))
                .sortBy((micropost) => micropost.createdAt)
                .value()
                .slice(0, 10),
            },
          },
        },
      }, 'equals');
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
            allMicroposts(first: 100, favoritedBy: {
              includes: $id
            }, orderBy: CREATED_AT_ASC) {
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
            allMicroposts(first: 10, favoritedBy: {
              excludes: $id
            }, orderBy: CREATED_AT_ASC) {
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

    describe('conflicting filter names', () => {
      let testFixture;
      before(async () => {
        await migrate(runQuery, augmentSchema(
          TEST_SCHEMA,
          [
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
                  name: 'before',
                  type: 'DateTime',
                  filterable: true,
                },
                {
                  name: 'beforeFilter',
                  type: 'DateTime',
                  filterable: true,
                },
                {
                  name: 'arguments',
                  type: 'String',
                  filterable: true,
                },
              ],
            },
          ],
        ), true);

        testFixture = await createFixture(runQuery, 'Test', {
          before: '2020-01-01',
          beforeFilter: '2010-01-01',
          arguments: 'yes!',
        }, `id before beforeFilter arguments`);
      });

      after(async () => {
        await migrate(runQuery, TEST_SCHEMA, true);
      });

      it('must work with conflicting filter names', async () => {
        assert.deepEqual(await runQuery(`
          {
            viewer {
              allTests(
                _before: { gt: "2015-01-01" },
                beforeFilter: { lt: "2015-01-01" }
                arguments: { eq: "yes!" }
              ) {
                nodes {
                  id
                  before
                  beforeFilter
                  arguments
                }
              }
            }
          }
        `), {
          data: {
            viewer: {
              allTests: {
                nodes: [
                  testFixture,
                ],
              },
            },
          },
        });

        assert.deepEqual(await runQuery(`
          {
            viewer {
              allTests(
                _before: { lt: "2015-01-01" },
                beforeFilter: { gt: "2015-01-01" }
              ) {
                nodes {
                  id
                  before
                  beforeFilter
                  arguments
                }
              }
            }
          }
        `), {
          data: {
            viewer: {
              allTests: {
                nodes: [],
              },
            },
          },
        });
      });
    });
  }
});
