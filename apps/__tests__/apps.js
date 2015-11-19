import uuid from 'uuid';
import JSONWebToken from 'jsonwebtoken';

import assert from '../../test/assert';

import createApp from '../createApp';
import createToken from '../createToken';
import hasApp from '../hasApp';
import deleteApp from '../deleteApp';

describe('Application management', () => {
  it('creates, deletes and checks existance of the app.', async () => {
    const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';

    assert(!(await hasApp(host)), 'app is not there before.');

    const appInfo = await createApp(host);

    assert.deepEqual(appInfo, {
      secret: appInfo.secret,
      hostname: host,
    }, 'valid app is created');

    assert(await hasApp(host), 'app is there now');

    await deleteApp(host);

    assert(!(await hasApp(host)), 'app is not there anymore');
  });

  it('creates valid token', async () => {
    const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';

    assert(!(await hasApp(host)), 'app is not there before.');

    const appInfo = await createApp(host);
    const token = await createToken(host);

    JSONWebToken.verify(token, appInfo.secret, {
      algorithms: ['HS256'],
    });

    await deleteApp(host);
  });
});
