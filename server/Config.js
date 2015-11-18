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
  Database: {
    type: {
      default: 'rethinkdb',
      doc: 'Database engine to use. Possible values: "rethinkdb".',
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
  SocialLoginPlugin: {
    cookiePassword: {
      default: Cryptiles.randomString(40),
      doc: 'A random secret used for Iron cookie encoding',
      env: 'COOKIE_PASSWORD',
      format: String,
    },
  },
  AWS: {
    DynamoDBEndpoint: {
      default: 'localhost:7777',
      doc: 'AWS region endpoint',
      env: 'DYNAMODB_ENDPOINT',
    },
    DynamoDBRootStorage: {
      default: 'reindex_kv',
      doc: 'table name for root k/v storage',
      env: 'DYNAMODB_ROOT_STORAGE',
    },
    DynamoDBTypeIndex: {
      default: 'reindex_typeindex',
      doc: 'name of index for types',
      env: 'DYNAMODB_TYPE_INDEX_NAME',
    },
    DynamoDBIndexTable: {
      default: 'reindex_indexes',
      doc: 'name for index table',
      env: 'DYNAMODB_INDEX_TABLE',
    },
    accessKeyId: {
      default: undefined,
      doc: 'AWS Access Key Id',
      env: 'AWS_ACCESS_KEY',
    },
    accessKeySecret: {
      default: undefined,
      doc: 'AWS Access Key Secret',
      env: 'AWS_SECRET_KEY',
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
  Config.set(
    'AWS.DynamoDBEndpoint',
    Config.default('AWS.DynamoDBEndpoint'),
  );
  Config.set(
    'AWS.accessKeyId',
    undefined,
  );
  Config.set(
    'AWS.accessKeySecret',
    undefined
  );
  Config.validate();
};

export default Config;
