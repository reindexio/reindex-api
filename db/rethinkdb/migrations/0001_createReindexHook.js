import RethinkDB from 'rethinkdb';

import runMigration from './runMigration';

/**
 * 2015-11-03: Add ReindexHook table
 **/
async function main() {
  await runMigration([
    RethinkDB.do(
      RethinkDB.tableList(),
      (tables) =>
        RethinkDB.branch(
          tables.contains('ReindexHook'),
          {},
          RethinkDB.tableCreate('ReindexHook')
        )
    ),
  ]);
}

main();
