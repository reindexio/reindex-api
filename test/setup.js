import Config from '../server/Config';
import assert from './assert';

before(() => {
  Config.resetTestConfig();

  assert.deepEqual(Config.get('RethinkDB'), {
    host: 'localhost',
    port: 28015,
  });
});
