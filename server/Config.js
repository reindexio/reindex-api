import Path from 'path';

import convict from 'convict';
import Cryptiles from 'cryptiles';
import { isPlainObject, isString, values } from 'lodash';

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
  database: {
    adminCluster: {
      default: 'mongodb',
      doc: 'The cluster name of the admin app.',
      env: 'ADMIN_CLUSTER',
      format: String,
    },
    adminDatabase: {
      default: 'r_admin',
      doc: 'The database name of the admin app.',
      env: 'ADMIN_DATABASE',
      format: String,
    },
    clusters: {
      default: JSON.stringify({
        mongodb: {
          type: DatabaseTypes.MongoDB,
          connectionString: 'mongodb://localhost/%s',
        },
        rethinkdb: {
          type: DatabaseTypes.RethinkDB,
          host: 'localhost',
        },
      }),
      doc: 'A JSON blob with all database cluster configurations',
      env: 'DATABASE_CLUSTERS',
      format: validateClusters,
    },
    defaultCluster: {
      default: 'mongodb',
      doc: 'The default database cluster.',
      env: 'DEFAULT_CLUSTER',
      format: String,
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
  [
    'connection.port',
    'database.adminCluster',
    'database.adminDatabase',
    'database.clusters',
    'database.defaultCluster',
    'Intercom.appId',
    'Intercom.appApiKey',
    'Intercom.secretKey',
    'SocialLoginPlugin.cookiePassword',
  ].forEach((key) => {
    Config.set(key, Config.default(key));
  });
  Config.validate();
};

function validateClusters(value) {
  const clusters = JSON.parse(value);
  if (!isPlainObject(clusters)) {
    throw new Error('must be a plain JSON object');
  }
  values(clusters).forEach((cluster) => {
    if (!isPlainObject(cluster)) {
      throw new Error('each config must be an object');
    }
    if (!isString(cluster.type)) {
      throw new Error('each config must be define the property `type`');
    }
  });
}

export default Config;
