if (process.env.NEW_RELIC_APP_NAME) {
  require('newrelic');
}
require('babel/register');
require('./server/main')();
