import JSONWebToken from 'jsonwebtoken';
import uuid from 'uuid';

import assert from '../../test/assert';
import createApp from '../createApp';
import createToken from '../createToken';
import hasApp from '../hasApp';
import deleteApp from '../deleteApp';

describe('Application management', () => {
  it('creates, deletes and checks existence of an app.', async () => {
    const host1 = `test.${uuid.v4()}.example.com`;
    const host2 = `test.${uuid.v4()}.example.com`;
    assert(!(await hasApp(host1)));
    assert(!(await hasApp(host2)));
    const app1 = await createApp(host1, 'mongodb');
    const app2 = await createApp(host2, 'rethinkdb');
    assert.equal(app1.database.cluster, 'mongodb');
    assert.equal(app2.database.cluster, 'rethinkdb');
    assert.instanceOf(app1.createdAt, Date);
    assert.instanceOf(app2.createdAt, Date);
    assert(await hasApp(host1));
    assert(await hasApp(host2));
    await deleteApp(host1);
    await deleteApp(host2);
    assert(!(await hasApp(host1)));
    assert(!(await hasApp(host2)));
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
