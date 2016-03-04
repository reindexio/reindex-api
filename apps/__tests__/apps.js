import JSONWebToken from 'jsonwebtoken';
import uuid from 'uuid';

import assert from '../../test/assert';
import Config from '../../server/Config';
import createApp from '../createApp';
import createToken from '../createToken';
import getAdminDB from '../../db/getAdminDB';
import hasApp from '../hasApp';
import deleteApp from '../deleteApp';

describe('Application management', () => {
  let adminDB;
  before(() => {
    adminDB = getAdminDB();
  });
  after(async () => {
    await adminDB.close();
  });

  it('creates, deletes and checks existence of an app.', async () => {
    const host1 = `test.${uuid.v4()}.example.com`;
    const host2 = `test.${uuid.v4()}.example.com`;
    assert(!(await hasApp(host1)));
    assert(!(await hasApp(host2)));
    const app1 = await createApp(host1);
    const app2 = await createApp(host2);
    assert.instanceOf(app1.createdAt, Date);
    assert.instanceOf(app2.createdAt, Date);
    assert(await hasApp(host1));
    assert(await hasApp(host2));
    await deleteApp(host1);
    await deleteApp(host2);
    assert(!(await hasApp(host1)));
    assert(!(await hasApp(host2)));
  });

  it('creates the app in the storage with most DBs available', async () => {
    const settings = JSON.parse(Config.get('database.adminDatabaseSettings'));
    await adminDB.create('Storage', { databasesAvailable: 300, settings });
    await adminDB.create('Storage', { databasesAvailable: 400, settings });
    const bestStorage = await adminDB.create('Storage', {
      databasesAvailable: 500,
      settings,
    });
    const worstStorage = await adminDB.create('Storage', {
      databasesAvailable: 1,
      settings,
    });

    const app = await createApp(`test.${uuid.v4()}.example.com`);
    assert.deepEqual(app.storage, bestStorage.id);

    assert.deepEqual(
      {
        ...bestStorage,
        databasesAvailable: bestStorage.databasesAvailable - 1,
      },
      await adminDB.getByID('Storage', bestStorage.id),
      'databasesAvailable is decremented by 1.',
    );
    assert.deepEqual(
      worstStorage,
      await adminDB.getByID('Storage', worstStorage.id),
      'Other storages remain unchanged.',
    );
  });

  it('creates valid token', async () => {
    const host = `test.${uuid.v4()}.example.com`;

    assert(!(await hasApp(host)), 'app is not there before.');

    const app = await createApp(host);
    const token = await createToken(host);

    JSONWebToken.verify(token, app.secret, {
      algorithms: ['HS256'],
    });

    await deleteApp(host);
  });
});
