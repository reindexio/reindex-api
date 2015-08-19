import { fromJS, List, Range } from 'immutable';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';

import assert from '../../../test/assert';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../../../test/testDatabase';
import extractIndexes from '../../extractIndexes';
import { getTypes, getPageInfo } from '../simpleQueries';
import { getConnectionQueries } from '../connectionQueries';

describe('Connection database queries', () => {
  const db = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;

  before(async function () {
    conn = await RethinkDB.connect({ db });
    await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await conn.close();
  });

  async function getIndexes(table) {
    return extractIndexes(fromJS(await getTypes(conn))).get(table);
  }

  describe('getConnectionQueries', () => {
    let orderedIds;
    before(async function() {
      orderedIds = await RethinkDB
        .table('Micropost')
        .orderBy('createdAt')
        .map((obj) => obj('id'))
        .run(conn);
    });

    async function runAndGivePositions(
      indexes, args, queryType = 'paginatedQuery', indexOptions = {},
    ) {
      return fromJS(await (await getConnectionQueries(
          conn,
          'Micropost',
          indexes,
          indexOptions,
          args
        ))[queryType]
        .map((item) => item('id')('value'))
        .coerceTo('array')
        .run(conn)
      ).map((id) => orderedIds.indexOf(id));
    }

    it('creates index on demand and once', async function() {
      const indexList = await RethinkDB
        .table('Micropost')
        .indexList()
        .run(conn);
      const indexes = await getIndexes('Micropost');

      await runAndGivePositions(
        indexes,
        { orderBy: { field: 'createdAt' } },
      );
      const newIndexList = await RethinkDB
        .table('Micropost')
        .indexList()
        .run(conn);
      const newIndexes = await getIndexes('Micropost');

      assert.equal(newIndexList.length, indexList.length + 1,
        'one index is created');
      assert.oequal(newIndexes.last().fields, fromJS([['createdAt']]));

      await runAndGivePositions(
        newIndexes,
        { orderBy: { field: 'createdAt' } },
      );
      const newestIndexList = await RethinkDB
        .table('Micropost')
        .indexList()
        .run(conn);
      const newestIndexes = await getIndexes('Micropost');

      assert.deepEqual(newestIndexList, newIndexList, 'index created once');
      assert.oequal(newestIndexes, newIndexes, 'index stored in metadata once');
    });

    it('orders query', async function() {
      const indexes = await getIndexes('Micropost');
      assert.oequal(
        await runAndGivePositions(indexes, { orderBy: { field: 'createdAt' } }),
        Range(0, 7)
      );
      assert.oequal(
        await runAndGivePositions(indexes, {
          orderBy: { field: 'createdAt', order: 'DESC' },
        }),
        Range(6, -1)
      );
    });

    describe('does relay conformant paging', () => {
      let cursors;
      let indexes;
      it('creates cursors', async function() {
        indexes = await getIndexes('Micropost');
        const result = await getConnectionQueries(
          conn,
          'Micropost',
          indexes,
          {},
          { orderBy: { field: 'createdAt' } }
        );
        cursors = List(await result.paginatedQuery
          .map(result.cursorFn)
          .coerceTo('array')
          .run(conn)
        );

        assert.oequal(
          cursors.map((cursor) => cursor.value),
          fromJS([
            'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d85',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d86',
            'f2f7fb49-3581-4caa-b84b-e9489eb47d87',
          ]),
        );
      });

      it('excludes at cursor and all before/after them', async function() {
        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            after: cursors.get(1),
          }),
          Range(2, 7),
          'only after'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            before: cursors.get(2),
          }),
          Range(0, 2),
          'only before'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            after: cursors.get(1),
            before: cursors.get(5),
          }),
          Range(2, 5),
          'before and after'
        );

        // XXX(freiksenet, 2015-08-12): this is not strictly compliant to
        // relay spec, that asks to not apply one of the cursors if they are
        // disjoint.
        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            before: cursors.get(1),
            after: cursors.get(5),
          }),
          List(),
          'disjoint before and after'
        );
      });

      it('slices with first and last', async function() {
        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            first: 4,
            last: 2,
          }),
          Range(2, 4),
          'first and last without cursor, enough items for last'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            first: 2,
            last: 3,
          }),
          Range(0, 2),
          'first and last without cursor, not enough items for last'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            first: 2,
          }),
          Range(3, 5),
          'first and after'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            last: 2,
          }),
          Range(5, 7),
          'last and after'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            before: cursors.get(4),
            first: 2,
          }),
          Range(0, 2),
          'first and before'
        );

        assert.oequal(
          await runAndGivePositions(indexes, {
            orderBy: { field: 'createdAt' },
            before: cursors.get(4),
            last: 2,
          }),
          Range(2, 4),
          'last and before'
        );
      });

      it('creates valid pageInfo', async function () {
        async function runAndGetPageInfo(args) {
          const result = await getConnectionQueries(
            conn,
            'Micropost',
            indexes,
            {},
            args,
          );
          return getPageInfo(conn, result.pageInfo);
        }
        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
          }),
          {
            hasPreviousPage: false,
            hasNextPage: false,
          },
          'no first or last'
        );

        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            first: 2,
          }),
          {
            hasPreviousPage: false,
            hasNextPage: true,
          },
          'first has enough stuff'
        );

        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            first: 7,
          }),
          {
            hasPreviousPage: false,
            hasNextPage: false,
          },
          'first has not enough stuff'
        );

        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            last: 2,
          }),
          {
            hasPreviousPage: true,
            hasNextPage: false,
          },
          'last has enough stuff'
        );

        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            last: 7,
          }),
          {
            hasPreviousPage: false,
            hasNextPage: false,
          },
          'last has not enough stuff'
        );

        assert.deepEqual(
          await runAndGetPageInfo({
            orderBy: { field: 'createdAt' },
            after: cursors.get(2),
            first: 3,
            last: 3,
          }),
          {
            hasPreviousPage: true,
            hasNextPage: true,
          },
          'confusing first and last combo behaviour'
        );
      });
    });

    it('returns both sliced and unsliced query', async function() {
      const indexes = await getIndexes('Micropost');
      assert.oequal(
        await runAndGivePositions(indexes, {
          first: 1,
          orderBy: { field: 'createdAt' },
        }, 'query'),
        Range(0, 7)
      );

      assert.oequal(
        await runAndGivePositions(indexes, {
          first: 1,
          orderBy: { field: 'createdAt' },
        }, 'paginatedQuery'),
        Range(0, 1)
      );
    });

    it('works with indexOptions', async function() {
      let indexes = await getIndexes('Micropost');
      assert.oequal(
        await runAndGivePositions(indexes, {
          orderBy: { field: 'createdAt' },
        }, 'paginatedQuery', {
          keyPrefixFields: fromJS([['author', 'value']]),
          keyPrefix: List.of('bbd1db98-4ac4-40a7-b514-968059c3dbac'),
        }),
        Range(0, 7),
      );

      indexes = await getIndexes('Micropost');
      const result = await getConnectionQueries(
        conn,
        'Micropost',
        indexes,
        {
          keyPrefixFields: fromJS([['author', 'value']]),
          keyPrefix: List.of('bbd1db98-4ac4-40a7-b514-968059c3dbac'),
        },
        { orderBy: { field: 'createdAt' } }
      );
      const cursors = List(await result.paginatedQuery
        .map(result.cursorFn)
        .coerceTo('array')
        .run(conn)
      );

      assert.oequal(
        await runAndGivePositions(indexes, {
          orderBy: { field: 'createdAt' },
          after: cursors.get(2),
          before: cursors.get(5),
        }, 'paginatedQuery', {
          keyPrefixFields: fromJS([['author', 'value']]),
          keyPrefix: List.of('bbd1db98-4ac4-40a7-b514-968059c3dbac'),
        }),
        Range(3, 5),
      );
    });
  });
});
