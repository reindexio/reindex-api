import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import {printSchema} from 'graphql/utilities';

import createSchema from '../graphQL/createSchema';
import {getTypes} from '../db/queries';

import databaseNameFromHostname from '../server/databaseNameFromHostname';

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }

  const db = databaseNameFromHostname(hostname);

  const conn = await RethinkDB.connect({ db });
  try {


    const types = await getTypes(conn);
    const schema = createSchema(Immutable.fromJS(types));
    process.stdout.write(printSchema(schema));
  } finally {
    await conn.close();
  }
}

main();
