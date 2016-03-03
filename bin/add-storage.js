import DatabaseTypes from '../db/DatabaseTypes';
import getAdminDB from '../db/getAdminDB';
import { choose, confirm, prompt } from '../utilities';
import { TIMESTAMP } from '../graphQL/builtins/DateTime';

async function readSettings() {
  const types = Object.values(DatabaseTypes).sort();
  const defaultType = DatabaseTypes.MongoDB;
  const choices = types.map((name) =>
    name === defaultType ? `[${name}]` : name
  ).join(', ');
  const type = await choose(`Database type: (${choices})`, types, {
    default: defaultType,
  });

  if (type === DatabaseTypes.MongoDB ||
      type === DatabaseTypes.MongoDBReplicaSet) {
    const connectionString = await prompt(
      'Connection string: (mongodb://localhost/)',
      { default: 'mongodb://localhost/' }
    );
    return { type, connectionString };
  } else if (type === DatabaseTypes.RethinkDB) {
    const host = await prompt('Host: (localhost)', {
      default: 'localhost',
    });
    const authKey = await prompt('Auth key: ', { default: '' }) || undefined;
    return { type, host, authKey };
  }
}

async function main() {
  const adminDB = getAdminDB('localhost');
  do {
    const databasesAvailable = parseInt(
      await prompt('Number of databases allowed: (1)', { default: 1 }),
      10,
    );
    const settings = await readSettings();
    const databaseName = await prompt('Name: ', { default: '' }) || undefined;
    const storage = await adminDB.create('Storage', {
      createdAt: TIMESTAMP,
      databasesAvailable,
      databaseName,
      settings,
    });
    console.log('Created: \n', storage);
  } while (await confirm('Add another storage? (y/n)'));
  await adminDB.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
