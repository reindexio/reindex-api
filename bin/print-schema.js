import Immutable from 'immutable';
import { printSchema } from 'graphql/utilities';

import createSchema from '../graphQL/createSchema';
import { getTypes } from '../db/queries/simpleQueries';

import { getConnection, releaseConnection } from '../db/dbConnections';
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

  const conn = await getConnection(db);

  try {
    const types = await getTypes(conn);
    const schema = createSchema(Immutable.fromJS(types));
    console.log(printSchema(schema));
  } catch (e) {
    console.error(e.stack);
  } finally {
    await releaseConnection(conn);
  }
}

main();
