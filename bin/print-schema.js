import Immutable from 'immutable';
import { printSchema } from 'graphql/utilities';

import createSchema from '../graphQL/createSchema';

import getDB from '../db/getDB';

function usage() {
  console.log(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }

  const db = getDB(hostname);
  try {
    const types = await db.getTypes();
    const schema = createSchema(Immutable.fromJS(types));
    console.log(printSchema(schema));
  } catch (e) {
    console.error(e.stack);
  } finally {
    await db.close();
  }
}

main();
