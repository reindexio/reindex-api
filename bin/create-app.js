import Cryptiles from 'cryptiles';
import RethinkDB from 'rethinkdb';
import {Map} from 'immutable';

import databaseNameFromHostname from '../server/databaseNameFromHostname';
import * as DBConstants from '../db/DBConstants';

async function createDatabase(dbName) {
  const conn = await RethinkDB.connect();
  await RethinkDB.dbCreate(dbName).run(conn);
  conn.use(dbName);
  await* Map(DBConstants)
    .map((table) =>
      RethinkDB.db(dbName).tableCreate(table).run(conn)
    );
  return conn;
}

function generateSecret() {
  return Cryptiles.randomString(40);
}

async function createSecret(conn) {
  const secret = generateSecret();
  await RethinkDB.table(DBConstants.SECRET_TABLE)
    .insert({ value: secret })
    .run(conn);
  return secret;
}

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }

  let conn;
  try {
    process.stdout.write(`Creating ${hostname}... `);
    conn = await createDatabase(databaseNameFromHostname(hostname));
    const secret = await createSecret(conn);
    process.stdout.write(`done.
        app: ${hostname}:5000
        secret: ${secret}\n`);
  } catch (e) {
    process.stdout.write('failed.\n');
    console.error(e);
  } finally {
    await conn.close();
  }
}

main();
