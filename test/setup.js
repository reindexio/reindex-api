import Config from '../server/Config';
import assert from './assert';

before(() => {
  Config.resetTestConfig();

  assert.deepEqual(Config.get('RethinkDBPlugin'), {
    host: 'localhost',
    port: 28015,
  });
});
