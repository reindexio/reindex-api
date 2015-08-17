import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import {printSchema} from 'graphql/utilities';

import createSchema from '../graphQL/createSchema';
import {getTypes} from '../db/queries/simple';

import databaseNameFromHostname from '../server/databaseNameFromHostname';

function usage() {
  console.log(`Usage: ${process.argv[1]} HOSTNAME\n`);
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
    console.log(printSchema(schema));
  } catch (e) {
    console.error(e.stack);
  } finally {
    await conn.close();
  }
}

main();
