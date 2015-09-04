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

export default Config;
