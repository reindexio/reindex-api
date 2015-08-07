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
import * as queries from '../../db/queries';

describe('Database tests', () => {
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

  describe('Database access functions return correct data', () => {
    it('getSecrets', async function() {
      assert.deepEqual(
        (await queries.getSecrets(conn))[0],
        TEST_DATA.getIn(['tables', SECRET_TABLE, 0, 'value'])
      );
    });

    it('getTypes', async function() {
      assert.oequal(
        fromJS(await queries.getTypes(conn)).toSet(),
        TEST_DATA.getIn(['tables', TYPE_TABLE]).toSet(),
      );
    });

    it('getAuthenticationProvider', async function() {
      assert.deepEqual(
        await queries.getAuthenticationProvider(conn, 'github'),
        processIds(
          AUTHENTICATION_PROVIDER_TABLE,
          TEST_DATA.getIn(['tables', AUTHENTICATION_PROVIDER_TABLE])
        ).toJS()[0],
      );
    });

    it('getAll', async function() {
      assert.oequal(
        fromJS(await queries
          .getAllQuery('Micropost')
          .coerceTo('array')
          .run(conn)
        ).toSet(),
        processIds(
          'Micropost',
          TEST_DATA.getIn(['tables', 'Micropost']).toSet()
        )
      );
    });

    it('getByID', async function() {
      assert.deepEqual(
        await queries.getByID(
          conn,
          {
            value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
            type: 'User',
          }
        ),
        {
          id: {
            value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
            type: 'User',
          },
          handle: 'fson',
        }
      );
    });

    it('getAllByIndexQuery', async function() {
      assert.oequal(
        fromJS(await queries
          .getAllByIndexQuery(
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
      const base = queries.getAllQuery('Micropost');
      assert.equal(await queries.getCount(conn, base), 4);
    });

    it('getNodes', async function() {
      const base = queries.getAllQuery('Micropost');
      assert.oequal(
        fromJS(await queries.getNodes(conn, base)).toSet(),
        processIds(
          'Micropost',
          TEST_DATA.getIn(['tables', 'Micropost']
        )).toSet(),
      );
    });

    it('getEdges', async function() {
      const base = queries.getAllQuery('Micropost');
      assert.oequal(
        fromJS(await queries.getEdges(conn, base)).toSet(),
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
        const result = await queries.create(conn, 'User', {
          handle: 'villeimmonen',
        });
        id = result.id;
        const resultInDb = await queries.getByID(conn, id);
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
        const result = await queries.update(conn, 'User', id, {
          handle: 'immonenville',
          email: 'immonenv@example.com',
        });
        const resultInDb = await queries.getByID(conn, id);
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
        const result = await queries.replace(conn, 'User', id, {
          handle: 'villeimmonen',
        });
        const resultInDb = await queries.getByID(conn, id);
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
        const result = await queries.deleteQuery(conn, 'User', id, {
          handle: 'villeimmonen',
        });
        const resultInDb = await queries.getByID(conn, id);
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
        conn,
        'github',
        credentials
      );
      assert.deepEqual(user.credentials.github, credentials);
      const newUser = await queries.getOrCreateUser(
        conn,
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
          queries.getAllQuery(table),
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
