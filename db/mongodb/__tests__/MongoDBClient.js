import uuid from 'uuid';

import assert from '../../../test/assert';
import {
  createTestApp,
  createFixture,
  deleteFixture,
  migrate,
  makeRunQuery,
  augmentSchema,
} from '../../../test/testAppUtils';
import { TEST_SCHEMA } from '../../../test/fixtures';
import {
  fromReindexID,
} from '../../../graphQL/builtins/ReindexID';
import deleteApp from '../../../apps/deleteApp';
import getDB from '../../getDB';
import { addTransform } from '../queries/queryUtils';
import DatabaseTypes from '../../DatabaseTypes';
import TypeRegistry from '../../../graphQL/TypeRegistry';
import TypeSet from '../../../graphQL/TypeSet';

function createTypeRegistry(typeSpecs) {
  const typeRegistry = new TypeRegistry();
  for (const spec of typeSpecs) {
    typeRegistry.registerTypeSet(new TypeSet(spec));
  }
  return typeRegistry;
}

if (!process.env.DATABASE_TYPE ||
    process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
  describe('MongoDBClient', () => {
    const hostname = `test.${uuid.v4()}.example.com`;
    let db;
    let runQuery;
    let user;
    const microposts = [];
    let micropostIDs;
    let context;

    before(async () => {
      await createTestApp(hostname);
      db = await getDB(hostname);
      runQuery = makeRunQuery(db);
      const schema = augmentSchema(TEST_SCHEMA, [
        {
          name: 'Contact',
          kind: 'OBJECT',
          interfaces: [],
          fields: [
            {
              name: 'email',
              type: 'String',
              unique: true,
            },
          ],
        },
        {
          name: 'User',
          fields: [
            {
              name: 'contact',
              type: 'Contact',
            },
          ],
        },
      ]);
      context = {
        typeRegistry: createTypeRegistry(schema),
      };
      await migrate(runQuery, schema);

      user = await createFixture(runQuery, 'User', {
        handle: 'user',
        credentials: {
          github: {
            id: '1',
          },
        },
        contact: {
          email: 'user@example.com',
        },
      }, 'id, handle');

      for (let i = 0; i < 100; i++) {
        const createdMicropost = await createFixture(runQuery, 'Micropost', {
          text: `text-${i % 5}`,
          createdAt: '@TIMESTAMP',
          author: user.id,
        }, 'id');
        createdMicropost.cursor = {
          value: fromReindexID(createdMicropost.id).value,
        };
        microposts.push(createdMicropost);
      }
      micropostIDs = microposts.map((post) => fromReindexID(post.id));
    });

    after(async function () {
      await db.close();
      await deleteApp(hostname);
    });

    async function getIDs(filter, args) {
      const {
        paginatedQuery,
        query,
        pageInfo,
      } = await db.getConnectionQueries('Micropost', filter, args, context);
      const result = {
        paginated: await addTransform(
          paginatedQuery.getCursor(),
          (item) => item.id
        ).toArray(),
        unpaginated: await query.toArray(),
        pageInfo,
      };
      return result;
    }

    describe('mutation tests', () => {
      it('does not clear object when passed an empty update', async () => {
        const id = fromReindexID(user.id);
        const result = await db.update('User', id, {});
        assert.deepEqual({
          handle: result.handle,
          id: user.id,
        }, user);
      });
    });

    describe('Relay-compliant pagination', () => {
      it('before and after', async () => {
        let { paginated } = await getIDs([], {
          after: microposts[0].cursor,
        });
        assert.deepEqual(paginated, micropostIDs.slice(1),
          'just after',
        );
        ({ paginated } = await getIDs([], {
          before: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(0, 5),
          'just before',
        );
        ({ paginated } = await getIDs([], {
          after: microposts[2].cursor,
          before: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(3, 5),
          'before and after',
        );
        ({ paginated } = await getIDs([], {
          after: microposts[5].cursor,
          before: microposts[2].cursor,
        }));
        assert.deepEqual(paginated, [],
          'disjoint before and after',
        );
      });

      it('unpaginated query ignores pagination', async () => {
        const { unpaginated } = await getIDs([], {
          after: microposts[2].cursor,
          before: microposts[5].cursor,
          first: 2,
          last: 2,
        });
        assert.deepEqual(unpaginated.length, micropostIDs.length);
      });

      it('first and last', async () => {
        let { paginated } = await getIDs([], {
          first: 5,
        });
        assert.deepEqual(paginated, micropostIDs.slice(0, 5),
          'just first',
        );
        ({ paginated } = await getIDs([], {
          last: 5,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(95),
          'just last',
        );
        ({ paginated } = await getIDs([], {
          first: 5,
          last: 2,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(3, 5),
          'first and last, enough items for last',
        );
        ({ paginated } = await getIDs([], {
          first: 2,
          last: 5,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(0, 2),
          'first and last, not enough items for last',
        );
        ({ paginated } = await getIDs([], {
          first: 2,
          before: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(0, 2),
          'first and before',
        );
        ({ paginated } = await getIDs([], {
          first: 2,
          after: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(6, 8),
          'first and after',
        );
        ({ paginated } = await getIDs([], {
          last: 2,
          before: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(3, 5),
          'last and before',
        );
        ({ paginated } = await getIDs([], {
          last: 2,
          after: microposts[5].cursor,
        }));
        assert.deepEqual(paginated, micropostIDs.slice(98, 100),
          'last and after',
        );
      });

      it('pageInfo', async () => {
        let { pageInfo } = await getIDs([], {});
        assert.deepEqual(pageInfo, {
          hasNextPage: false,
          hasPreviousPage: false,
        }, 'no first or last');
        ({ pageInfo } = await getIDs([], {
          first: 10,
          after: microposts[5].cursor,
        }));
        assert.deepEqual(pageInfo, {
          hasNextPage: true,
          hasPreviousPage: false,
        }, 'first has enough');
        ({ pageInfo } = await getIDs([], {
          first: 10,
          after: microposts[95].cursor,
        }));
        assert.deepEqual(pageInfo, {
          hasNextPage: false,
          hasPreviousPage: false,
        }, 'first does not have enough');
        ({ pageInfo } = await getIDs([], {
          last: 10,
          after: microposts[5].cursor,
        }));
        assert.deepEqual(pageInfo, {
          hasNextPage: false,
          hasPreviousPage: true,
        }, 'last has enough');
        ({ pageInfo } = await getIDs([], {
          last: 10,
          after: microposts[95].cursor,
        }));
        assert.deepEqual(pageInfo, {
          hasNextPage: false,
          hasPreviousPage: false,
        }, 'last does not have enough');
        ({ pageInfo } = await getIDs([], {
          first: 10,
          last: 20,
          after: microposts[0].cursor,
        }));
        assert.deepEqual(pageInfo, {
          hasNextPage: true,
          hasPreviousPage: true,
        }, 'first and last, illogical relay fun');
      });

      it('cursor stable after sequence is changed', async () => {
        const { paginated: original } = await getIDs([], {
          orderBy: {
            field: 'text',
          },
          first: 20,
        });

        const createdMicropost1 = await createFixture(runQuery, 'Micropost', {
          text: `zzz`,
          createdAt: '@TIMESTAMP',
        }, 'id');

        const createdMicropost2 = await createFixture(runQuery, 'Micropost', {
          text: `111`,
          createdAt: `@TIMESTAMP`,
        }, 'id');

        const { paginated } = await getIDs([], {
          orderBy: {
            field: 'text',
          },
          first: 19,
          after: {
            value: original[0].value,
          },
        });

        assert.deepEqual(paginated, original.slice(1));

        await deleteFixture(runQuery, 'Micropost', createdMicropost1.id);
        await deleteFixture(runQuery, 'Micropost', createdMicropost2.id);
      });

      it('ordering stable with duplicate ordering values', async () => {
        const { paginated: sortedOrder } = await getIDs([], {
          orderBy: {
            field: 'text',
          },
        });

        const { paginated } = await getIDs([], {
          orderBy: {
            field: 'text',
          },
          first: 5,
          after: {
            value: sortedOrder[10].value,
          },
        });
        assert.deepEqual(paginated, sortedOrder.slice(11, 16));
      });

      it('ordering and cursors work with order', async () => {
        let { paginated } = await getIDs([], {
          orderBy: {
            field: 'createdAt',
            order: 'DESC',
          },
          first: 5,
        });

        assert.deepEqual(paginated, micropostIDs.slice(95).reverse(),
          'no cursor');

        ({ paginated } = await getIDs([], {
          orderBy: {
            field: 'createdAt',
            order: 'DESC',
          },
          after: microposts[10].cursor,
          first: 5,
        }));

        assert.deepEqual(paginated, micropostIDs.slice(5, 10).reverse(),
          'after');

        ({ paginated } = await getIDs([], {
          orderBy: {
            field: 'createdAt',
            order: 'DESC',
          },
          before: microposts[95].cursor,
          first: 5,
        }));

        assert.deepEqual(paginated, micropostIDs.slice(96).reverse(),
          'before');
      });
    });

    describe('indexes', () => {
      it('uses index for unfiltered query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [],
          {},
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for unique query', async () => {
        const query = await db.getByFieldCursor('User', 'handle', 'user');
        const explain = await query.explain();

        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.inputStage.stage,
          'IXSCAN',
        );
      });

      it('uses index for unique nested query', async () => {
        const query = await db.getByFieldCursor(
          'User',
          'contact.email',
          'user@example.com'
        );
        const explain = await query.explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.inputStage.stage,
          'IXSCAN',
        );
      });


      it('user index for unique nested query for builtin field', async () => {
        const query = await db.getByFieldCursor(
          'User',
          'credentials.github.id',
          '1'
        );
        const explain = await query.explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.inputStage.stage,
          'IXSCAN',
        );
      });


      it('uses index for ordered unfiltered query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [],
          {
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for builtin', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'ReindexType',
          [],
          {
            orderBy: {
              field: 'name',
              order: 'ASC',
            },
          },
          {
            typeRegistry: createTypeRegistry([
              { name: 'ReindexType' },
            ]),
          }
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for filtered query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'eq',
              field: 'author.value',
              value: fromReindexID(user.id).value,
            },
          ],
          {
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for paginated query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [],
          {
            after: {
              value: fromReindexID(microposts[1].id).value,
            },
            first: 5,
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        const sort = (
          explain.queryPlanner.winningPlan.inputStage.inputStage.inputStage
        );
        assert.equal(
          sort.stage,
          'SORT_MERGE'
        );
        assert.deepEqual(
          sort.inputStages.map((stage) => stage.stage),
          ['IXSCAN', 'IXSCAN']
        );
      });

      it('uses index for paginated from two sides query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [],
          {
            after: {
              value: fromReindexID(microposts[1].id).value,
            },
            before: {
              value: fromReindexID(microposts[10].id).value,
            },
            first: 5,
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        const sort = (
          explain.queryPlanner.winningPlan.inputStage.inputStage.inputStage
        );
        assert.equal(
          sort.stage,
          'SORT_MERGE'
        );
        assert.deepEqual(
          sort.inputStages.map((stage) => stage.stage),
          ['IXSCAN', 'IXSCAN', 'IXSCAN']
        );
      });

      it('uses index for filtered paginated query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'eq',
              field: 'author.value',
              value: fromReindexID(user.id).value,
            },
          ],
          {
            after: {
              value: fromReindexID(microposts[1].id).value,
            },
            first: 5,
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );


        const explain = await paginatedQuery.getCursor().explain();
        const sort = (
          explain.queryPlanner.winningPlan.inputStage.inputStage.inputStage
        );
        assert.equal(
          sort.stage,
          'SORT_MERGE'
        );
        assert.deepEqual(
          sort.inputStages.map((stage) => stage.stage),
          ['IXSCAN', 'IXSCAN']
        );
      });

      it('uses index for filtered paginated from two sides query', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'eq',
              field: 'author.value',
              value: fromReindexID(user.id).value,
            },
          ],
          {
            after: {
              value: fromReindexID(microposts[1].id).value,
            },
            before: {
              value: fromReindexID(microposts[10].id).value,
            },
            first: 5,
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );


        const explain = await paginatedQuery.getCursor().explain();
        const sort = (
          explain.queryPlanner.winningPlan.inputStage.inputStage.inputStage
        );
        assert.equal(
          sort.stage,
          'SORT_MERGE'
        );
        assert.deepEqual(
          sort.inputStages.map((stage) => stage.stage),
          ['IXSCAN', 'IXSCAN', 'IXSCAN']
        );
      });

      it('uses indexs for filter with no ordering', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'lt',
              field: 'createdAt',
              value: new Date('2015-01-10'),
            },
          ],
          {},
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for filter on same field as ordering', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'lt',
              field: 'createdAt',
              value: new Date('2015-01-10'),
            },
          ],
          {
            orderBy: {
              field: 'createdAt',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('uses index for filter on same field as ordering with pagination',
        async () => {
          const { paginatedQuery } = await db.getConnectionQueries(
            'Micropost',
            [
              {
                op: 'lt',
                field: 'createdAt',
                value: new Date('2015-01-10'),
              },
            ],
            {
              orderBy: {
                field: 'createdAt',
                order: 'ASC',
              },
              after: {
                value: fromReindexID(microposts[1].id).value,
              },
              before: {
                value: fromReindexID(microposts[10].id).value,
              },
              first: 5,
            },
            context,
          );

          const explain = await paginatedQuery.getCursor().explain();
          const sort = explain.queryPlanner.winningPlan.inputStage.inputStage;
          assert.equal(
            sort.stage,
            'SORT_MERGE'
          );
          assert.deepEqual(
            sort.inputStages.map((stage) => stage.stage),
            ['IXSCAN', 'IXSCAN', 'IXSCAN']
          );
        }
      );

      it('uses index for filter on different field than ordering', async () => {
        const { paginatedQuery } = await db.getConnectionQueries(
          'Micropost',
          [
            {
              op: 'lt',
              field: 'createdAt',
              value: new Date('2015-01-10'),
            },
          ],
          {
            orderBy: {
              field: 'text',
              order: 'ASC',
            },
          },
          context,
        );

        const explain = await paginatedQuery.getCursor().explain();
        assert.equal(
          explain.queryPlanner.winningPlan.inputStage.stage, 'IXSCAN'
        );
      });

      it('deletes indexes', async () => {
        const indexes = (await db.getIndexes())
          .filter((index) => !index.type.startsWith('Reindex'));

        await migrate(runQuery, [
          {
            kind: 'OBJECT',
            name: 'User',
            interfaces: ['Node'],
            fields: [
              {
                name: 'id',
                type: 'ID',
                nonNull: true,
                unique: true,
              },
              {
                name: 'handle',
                type: 'String',
                unique: true,
              },
            ],
          },
        ], true);

        const newIndexes = (await db.getIndexes())
          .filter((index) => !index.type.startsWith('Reindex'));

        assert.sameDeepMembers(newIndexes, indexes.filter((index) =>
          index.type === 'User',
        ));

        const rawDB = await db.getDB();
        const rawIndexes = (await rawDB.collection('User').indexes())
          .map((index) => ({
            key: index.key,
            unique: index.unique,
          }));

        assert.sameDeepMembers(rawIndexes, [
          {
            key: { 'credentials.auth0.id': 1, _id: 1 },
            unique: true,
          },
          {
            key: { 'credentials.facebook.id': 1, _id: 1 },
            unique: true,
          },
          {
            key: { 'credentials.github.id': 1, _id: 1 },
            unique: true,
          },
          {
            key: { 'credentials.google.id': 1, _id: 1 },
            unique: true,
          },
          {
            key: { 'credentials.twitter.id': 1, _id: 1 },
            unique: true,
          },
          {
            key: {
              _id: 1,
            },
            unique: undefined,
          },
          {
            key: {
              handle: 1,
              _id: 1,
            },
            unique: true,
          },
          {
            key: { 'contact.email': 1, _id: 1 },
            unique: true,
          },
          {
            key: { email: 1, _id: 1 },
            unique: undefined,
          },
          {
            key: { email: 1, handle: 1, _id: 1 },
            unique: undefined,
          },
        ]);
      });
    });
  });
}
