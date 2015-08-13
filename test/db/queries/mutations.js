import assert from '../../assert';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';
import {
  createTestDatabase,
  deleteTestDatabase,
} from '../../testDatabase';
import {getByID} from '../../../db/queries/simple';
import * as queries from '../../../db/queries/mutations';

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
});
