import {fromJS, Map} from 'immutable';
import assert from '../assert';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';
import {
  createTestDatabase,
  deleteTestDatabase,
  TEST_DATA,
} from '../testDatabase';
import {
  AUTHENTICATION_PROVIDER_TABLE,
  SECRET_TABLE,
  TYPE_TABLE,
} from '../../db/DBConstants';
import DBContext from '../../db/DBContext';
import * as queries from '../../db/queries';

describe('Database tests', () => {
  const dbName = 'testdb' + uuid.v4().replace(/-/g, '_');
  const db = RethinkDB.db(dbName);
  let conn;
  let dbContext;

  before(async function () {
    conn = await RethinkDB.connect();
    dbContext = new DBContext({
      conn, db,
    });
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    await deleteTestDatabase(conn, dbName);
    await conn.close();
  });

  describe('Database access functions return correct data', () => {
    it('getApp', async function() {
      const result = fromJS(await queries.getApp(dbContext).run(conn));
      assert.oequal(
        result.getIn(['secrets', 0, 'value']),
        TEST_DATA.getIn(['tables', SECRET_TABLE, 0, 'value'])
      );
      assert.oequal(
        result.get('schema').toSet(),
        TEST_DATA.getIn(['tables', TYPE_TABLE]).toSet(),
      );
    });

    it('getSecrets', async function() {
      assert.deepEqual(
        (await queries.getSecrets(dbContext).run(conn))[0].value,
        TEST_DATA.getIn(['tables', SECRET_TABLE, 0, 'value'])
      );
    });

    it('getTypes', async function() {
      assert.oequal(
        fromJS(await queries.getTypes(dbContext).run(conn)).toSet(),
        TEST_DATA.getIn(['tables', TYPE_TABLE]).toSet(),
      );
    });

    it('getAuthenticationProvider', async function() {
      assert.deepEqual(
        await queries
          .getAuthenticationProvider(dbContext, 'github')
          .run(conn),
        processIds(
          AUTHENTICATION_PROVIDER_TABLE,
          TEST_DATA.getIn(['tables', AUTHENTICATION_PROVIDER_TABLE])
        ).toJS()[0],
      );
    });

    it('getAll', async function() {
      assert.oequal(
        fromJS(await queries
          .getAll(dbContext, 'Micropost')
          .coerceTo('array')
          .run(conn)
        ).toSet(),
        processIds(
          'Micropost',
          TEST_DATA.getIn(['tables', 'Micropost']).toSet()
        )
      );
    });

    it('getById', async function() {
      assert.deepEqual(
        await queries.getById(
          dbContext,
          'User',
          {
            value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
            type: 'User',
          }
        ).run(conn),
        {
          id: {
            value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
            type: 'User',
          },
          handle: 'fson',
        }
      );
    });

    it('getAllByIndex', async function() {
      assert.oequal(
        fromJS(await queries
          .getAllByIndex(
            dbContext,
            'Micropost',
            'bbd1db98-4ac4-40a7-b514-968059c3dbac',
            'author'
          )
          .coerceTo('array')
          .run(conn)
        ).toSet(),
        processIds(
          'Micropost',
           TEST_DATA.getIn(['tables', 'Micropost']).toSet()
        ),
      );
    });

    it('getCount', async function() {
      const base = queries.getAll(dbContext, 'Micropost');
      assert.equal(
        await queries.getCount(base).run(conn),
        4
      );
    });

    it('getNodes', async function() {
      const base = queries.getAll(dbContext, 'Micropost');
      assert.oequal(
        fromJS(await queries.getNodes(base).run(conn)).toSet(),
        processIds(
          'Micropost',
          TEST_DATA.getIn(['tables', 'Micropost']
        )).toSet(),
      );
    });

    it('getEdges', async function() {
      const base = queries.getAll(dbContext, 'Micropost');
      assert.oequal(
        fromJS(await queries.getEdges(base).run(conn)).toSet(),
        processIds(
          'Micropost',
          TEST_DATA.getIn(['tables', 'Micropost'])
        ).map((node) => Map({
          node,
        })).toSet(),
      );
    });

    describe('CRUD', () => {
      let id;

      it('create', async function() {
        const result = await queries.create(dbContext, 'User', {
          handle: 'villeimmonen',
        }).run(dbContext.conn);
        id = result.id;
        const resultInDb = await queries.getById(dbContext, 'User', id)
          .run(dbContext.conn);
        assert.deepEqual(
          result,
          resultInDb
        );
        assert.deepEqual(resultInDb, {
          id,
          handle: 'villeimmonen',
        });
      });

      it('update', async function() {
        const result = await queries.update(dbContext, 'User', id, {
          handle: 'immonenville',
          email: 'immonenv@example.com',
        }).run(dbContext.conn);
        const resultInDb = await queries.getById(dbContext, 'User', id)
          .run(dbContext.conn);
        assert.deepEqual(
          result,
          resultInDb
        );
        assert.deepEqual(resultInDb, {
          id,
          handle: 'immonenville',
          email: 'immonenv@example.com',
        });
      });

      it('replace', async function() {
        const result = await queries.replace(dbContext, 'User', id, {
          handle: 'villeimmonen',
        }).run(dbContext.conn);
        const resultInDb = await queries.getById(dbContext, 'User', id)
          .run(dbContext.conn);
        assert.deepEqual(
          result,
          resultInDb
        );
        assert.deepEqual(resultInDb, {
          id,
          handle: 'villeimmonen',
        });
      });

      it('delete', async function() {
        const result = await queries.deleteQuery(dbContext, 'User', id, {
          handle: 'villeimmonen',
        }).run(dbContext.conn);
        const resultInDb = await queries.getById(dbContext, 'User', id)
          .run(dbContext.conn);
        assert.isNull(
          resultInDb
        );
        assert.deepEqual(result, {
          id,
          handle: 'villeimmonen',
        });
      });
    });

    it('getOrCreateUser', async function() {
      const credentials = {
        accessToken: 'fakeAccessToken',
        displayName: 'Mikhail Novikov',
        email: 'freiksenet@example.com',
        id: 1,
        username: 'freiksenet',
      };
      const user = await queries.getOrCreateUser(
        dbContext,
        'github',
        credentials
      );
      assert.deepEqual(user.credentials.github, credentials);
      const newUser = await queries.getOrCreateUser(
        dbContext,
        'github',
        credentials
      );
      assert.equal(user.id.value, newUser.id.value);
    });
  });

  describe('processConnectionQuery', () => {
    async function runAndGiveIds(table, args, queryType = 'paginatedQuery') {
      return fromJS(await queries
        .processConnectionQuery(
          queries.getAll(dbContext, table),
          args
        )[queryType]
        .map((item) => item('id')('value'))
        .coerceTo('array')
        .run(conn)
      );
    }

    it('orders query', async function() {
      assert.oequal(
        await runAndGiveIds('Micropost', {orderBy: 'createdAt'}),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
        ]),
      );
    });

    it('orders query descendingly', async function() {
      assert.oequal(
        await runAndGiveIds('Micropost', {orderBy: '-createdAt'}),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
        ]),
      );
    });

    it('limits query', async function() {
      assert.oequal(
        await runAndGiveIds('Micropost', {first: 2, orderBy: 'createdAt'}),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
        ]),
      );

      assert.oequal(
        await runAndGiveIds('Micropost', {after: 2, orderBy: 'createdAt'}),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
        ]),
      );

      assert.oequal(
        await runAndGiveIds('Micropost', {
          first: 2,
          after: 1,
          orderBy: 'createdAt',
        }),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
        ]),
      );
    });

    it('returns both sliced and unsliced query', async function() {
      assert.oequal(
        await runAndGiveIds('Micropost', {
          first: 1,
          orderBy: 'createdAt',
        }, 'query'),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
          'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
        ]),
      );

      assert.oequal(
        await runAndGiveIds('Micropost', {
          first: 1,
          orderBy: 'createdAt',
        }, 'paginatedQuery'),
        fromJS([
          'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
        ]),
      );
    });
  });
});

function processIds(type, iterable) {
  return iterable.map((obj) => (
    obj.set('id', Map({
      type,
      value: obj.get('id'),
    }))
  ));
}
