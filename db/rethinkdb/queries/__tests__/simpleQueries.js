import uuid from 'uuid';
import { fromJS, Map } from 'immutable';
import RethinkDB from 'rethinkdb';

import { getConnection, releaseConnection } from '../../dbConnections';
import assert from '../../../../test/assert';
import injectDefaultFields
  from '../../../../graphQL/builtins/injectDefaultFields';
import {
  createTestDatabase,
  deleteTestDatabase,
  TEST_DATA,
} from './testDatabase';
import {
  AUTHENTICATION_PROVIDER_TABLE,
  SECRET_TABLE,
  TYPE_TABLE,
  INDEX_TABLE,
} from '../../DBTableNames';
import * as queries from '../simpleQueries';
import { queryWithIDs } from '../queryUtils';


describe('RethinkDB: Simple database queries', () => {
  const db = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;

  before(async function () {
    conn = await getConnection(db);
    await createTestDatabase(conn, db);
  });

  after(async function () {
    await deleteTestDatabase(conn, db);
    await releaseConnection(conn);
  });

  it('getSecrets', async function() {
    assert.deepEqual(
      (await queries.getSecrets(conn))[0],
      TEST_DATA.getIn(['tables', SECRET_TABLE, 0, 'value'])
    );
  });

  it('getTypes', async function() {
    assert.oequal(
      fromJS(await queries.getTypes(conn))
        .map((type) => type.delete('id'))
        .toSet(),
      TEST_DATA
        .getIn(['tables', TYPE_TABLE])
        .map((type) => type.set('fields', fromJS(
          injectDefaultFields(type.toJS())
        )))
        .toSet(),
    );
  });

  it('getIndexes', async function() {
    assert.oequal(
      fromJS(await queries.getIndexes(conn))
        .map((type) => type.delete('id'))
        .toSet(),
      TEST_DATA.getIn(['tables', INDEX_TABLE]).toSet(),
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

  it('getAllQuery', async function() {
    assert.oequal(
      fromJS(await queries
        .getAllQuery('Micropost')
        .coerceTo('array')
        .run(conn)
      ).toSet(),
      TEST_DATA.getIn(['tables', 'Micropost']).toSet()
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

  it('getByIndex', async () => {
    assert.deepEqual(
      await queries.getByIndex(
        conn,
        'User',
        {},
        'handle',
        'fson'
      ),
      {
        id: {
          value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
          type: 'User',
        },
        handle: 'fson',
      }
    );

    assert.deepEqual(
      await queries.getByIndex(
        conn,
        'User',
        {},
        'id',
        {
          value: '94b90d89-22b6-4abf-b6ad-2780bf9d0408',
          type: 'User',
        },
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

  it('getCount', async function() {
    const base = queries.getAllQuery('Micropost');
    assert.equal(
      await queries.getCount(conn, base),
      TEST_DATA.getIn(['tables', 'Micropost']).count()
    );
  });

  it('getNodes', async function() {
    const base = queries.getAllQuery('Micropost');
    assert.oequal(
      fromJS(await queries.getNodes(conn, base)).toSet(),
      TEST_DATA.getIn(['tables', 'Micropost']).toSet(),
    );
  });

  it('getEdges', async function() {
    const base = queryWithIDs('Micropost', queries.getAllQuery('Micropost'));
    assert.oequal(
      fromJS(await queries.getEdges(conn, base))
        .toSet(),
      processIds('Micropost', TEST_DATA.getIn(['tables', 'Micropost']))
        .map((node) => Map({
          cursor: Map({
            value: node.getIn(['id', 'value']),
          }),
          node,
        }))
        .toSet(),
    );
  });

  it('getPageInfo', async function() {
    const data = {
      hasNextPage: false,
      hasPreviousPage: true,
    };
    assert.deepEqual(
      await queries.getPageInfo(conn, RethinkDB.expr(data)),
      data
    );
    assert.deepEqual(
      await queries.getPageInfo(conn, data),
      data
    );
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
