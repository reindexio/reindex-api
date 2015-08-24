import uuid from 'uuid';
import RethinkDB from 'rethinkdb';

import { TYPE_TABLE } from '../../DBConstants';
import assert from '../../../test/assert';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../../../test/testDatabase';
import { getByID } from '../simpleQueries';
import * as queries from '../mutationQueries';
import { queryWithIDs } from '../queryUtils';

describe('Mutatative database queries', () => {
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

  describe('CRUD', () => {
    let id;

    it('create', async function() {
      const result = await queries.create(conn, 'User', {
        handle: 'villeimmonen',
      });
      id = result.id;
      const resultInDb = await getByID(conn, id);
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
      const resultInDb = await getByID(conn, id);
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
      const resultInDb = await getByID(conn, id);
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
      const resultInDb = await getByID(conn, id);
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

  it('create and delete type', async function() {
    const newNodeType = {
      name: 'NewNodeType',
      kind: 'OBJECT',
      interfaces: ['Node'],
      fields: [
        {
          name: 'id',
          type: 'ID',
          nonNull: true,
        },
      ],
    };
    const newType = {
      name: 'NewType',
      kind: 'OBJECT',
      interfaces: [],
      fields: [],
    };

    const nodeResult = await queries.createType(conn, newNodeType);
    const result = await queries.createType(conn, newType);
    const tables = await RethinkDB.tableList().run(conn);

    assert(tables.includes('NewNodeType'),
      'Node type is created as table');
    assert(!tables.includes('NewType'),
      'non-Node type is not created as table');

    assert.deepEqual(nodeResult, await queryWithIDs(
      'ReindexType',
      RethinkDB.table(TYPE_TABLE).filter({
        name: 'NewNodeType',
      })(0)).run(conn)
    );
    assert.deepEqual(result, await queryWithIDs(
      'ReindexType',
      RethinkDB.table(TYPE_TABLE).filter({
        name: 'NewType',
      })(0)).run(conn)
    );

    await queries.deleteType(conn, nodeResult.id);
    await queries.deleteType(conn, result.id);
    const afterDeleteTables = await RethinkDB.tableList().run(conn);

    assert(!afterDeleteTables.includes('NewNodeType'),
      'Node type is delete as table');
    assert(!afterDeleteTables.includes('NewType'),
      'non-Node type is still not a table');

    assert.equal(0, await RethinkDB.table(TYPE_TABLE).filter({
      name: 'NewNodeType',
    }).count().run(conn));
    assert.equal(0, await RethinkDB.table(TYPE_TABLE).filter({
      name: 'NewType',
    }).count().run(conn));
  });
});
