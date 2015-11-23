import Path from 'path';

import convict from 'convict';
import Cryptiles from 'cryptiles';

import DatabaseTypes from '../db/DatabaseTypes';

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
  Database: {
    type: {
      default: DatabaseTypes.RethinkDB,
      doc: 'Database engine to use. Possible values in db/DatabaseTypes.js.',
      format: String,
    },
  },
  RethinkDB: {
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
  RethinkDB2: {
    authKey: {
      default: undefined,
      doc: 'The RethinkDB authentication key',
      env: 'RETHINKDB2_AUTH_KEY',
      format: String,
    },
    databases: {
      default: [],
      doc: 'Database names for this cluster',
      env: 'RETHINKDB2_DATABASES',
      format: Array,
    },
    host: {
      default: 'localhost',
      doc: 'The host of RethinkDB to connect to.',
      env: 'RETHINKDB2_HOST',
      format: String,
    },
    port: {
      default: 28015,
      doc: 'The port of RethinkDB to connect to.',
      env: 'RETHINKDB2_PORT',
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
  Config.set('RethinkDB.authKey', undefined);
  Config.set('RethinkDB.host', 'localhost');
  Config.set('RethinkDB.port', 28015);
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
