import RethinkDB from 'rethinkdb';

import runMigration from './runMigration';

/**
 * 2015-11-11: Add ReindexHookLog table
 **/
async function main() {
  await runMigration([
    RethinkDB.do(
      RethinkDB.tableList(),
      (tables) =>
        RethinkDB.branch(
          tables.contains('ReindexHookLog'),
          {},
          RethinkDB.tableCreate('ReindexHookLog')
        )
    ),
  ]);
}

main();
