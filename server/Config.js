import Path from 'path';

import convict from 'convict';
import Cryptiles from 'cryptiles';

const Config = convict({
  connection: {
    port: {
      default: 5000,
      doc: 'The TCP port the connection will listen to.',
      env: 'PORT',
      format: 'port',
    },
    routes: {
      cors: true,
      files: {
        relativeTo: Path.join(__dirname, '..', 'public'),
      },
    },
  },
  Intercom: {
    appId: {
      default: undefined,
      doc: 'Intercom app ID',
      env: 'INTERCOM_APP_ID',
      format: String,
    },
    appApiKey: {
      default: undefined,
      doc: 'Intercom full access API key',
      env: 'INTERCOM_API_KEY',
      format: String,
    },
    secretKey: {
      default: undefined,
      doc: 'Intercom secret key for secure mode',
      env: 'INTERCOM_SECRET_KEY',
      format: String,
    },
  },
  RethinkDBPlugin: {
    authKey: {
      default: undefined,
      doc: 'The RethinkDB authentication key',
      env: 'RETHINKDB_AUTH_KEY',
      format: String,
    },
    host: {
      default: 'localhost',
      doc: 'The host of RethinkDB to connect to.',
      env: 'RETHINKDB_HOST',
      format: String,
    },
    port: {
      default: 28015,
      doc: 'The port of RethinkDB to connect to.',
      env: 'RETHINKDB_PORT',
      format: 'port',
    },
  },
  SocialLoginPlugin: {
    cookiePassword: {
      default: Cryptiles.randomString(40),
      doc: 'A random secret used for Iron cookie encoding',
      env: 'COOKIE_PASSWORD',
      format: String,
    },
  },
});

Config.load({}).validate();

Config.resetTestConfig = function() {
  Config.set('connection.port', 5000);
  Config.set('RethinkDBPlugin.authKey', undefined);
  Config.set('RethinkDBPlugin.host', 'localhost');
  Config.set('RethinkDBPlugin.port', 28015);
  Config.set('Intercom.appId', undefined);
  Config.set('Intercom.appApiKey', undefined);
  Config.set('Intercom.secretKey', undefined);
  Config.set(
    'SocialLoginPlugin.cookiePassword',
    Config.default('SocialLoginPlugin.cookiePassword')
  );
  Config.validate();
};

export default Config;
