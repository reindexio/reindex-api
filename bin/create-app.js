import Base64URL from 'base64-url';
import crypto from 'crypto';
import RethinkDB from 'rethinkdb';

import getBaseTypes from '../schema/getBaseTypes';
import {SECRET_TABLE} from '../query/QueryConstants';

async function createDatabase(dbName) {
  const conn = await RethinkDB.connect();
  await RethinkDB.dbCreate(dbName).run(conn);
  conn.use(dbName);
  await* getBaseTypes()
    .get('types')
    .filter((type) => type.get('isNode'))
    .map((type) =>
      RethinkDB.db(dbName).tableCreate(type.get('name')).run(conn)
    );
  return conn;
}

function generateSecret() {
  return Base64URL.escape(crypto.randomBytes(30).toString('base64'));
}

async function createSecret(conn) {
  const secret = generateSecret();
  await RethinkDB.table(SECRET_TABLE).insert({ value: secret }).run(conn);
  return secret;
}

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} APP\n`);
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    usage();
    return;
  }

  let conn;
  try {
    process.stdout.write(`Creating ${name}... `);
    conn = await createDatabase(name);
    const secret = await createSecret(conn);
    process.stdout.write(`done.
        app: ${name}.localhost.reindexio.com:5000
        secret: ${secret}\n`);
  } catch (e) {
    process.stdout.write('failed.\n');
    console.error(e);
  } finally {
    await conn.close();
  }
}

main();
