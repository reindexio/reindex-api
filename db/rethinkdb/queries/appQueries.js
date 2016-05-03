import RethinkDB from 'rethinkdb';
import { values } from 'lodash';

import * as DBTableNames from '../DBTableNames';
import { addID } from './queryUtils';

export async function createDatabaseForApp(conn, dbName) {
  await RethinkDB.dbCreate(dbName).run(conn);
  await Promise.all(values(DBTableNames).map((tableName) =>
    RethinkDB.db(dbName).tableCreate(tableName).run(conn)
  ));
  return true;
}

export async function deleteDatabaseForApp(conn, dbName) {
  await RethinkDB.dbDrop(dbName).run(conn);
}

export async function allocateStorage(conn, dbName, type) {
  const r = RethinkDB;
  const { replaced, changes } = await RethinkDB.db(dbName)
    .table('Storage')
    .filter((row) =>
      row('settings')('type').eq(type).and(row('databasesAvailable').gt(0))
    )
    .orderBy(r.desc('databasesAvailable'))
    .limit(1)
    .update(
      { databasesAvailable: r.row('databasesAvailable').sub(1) },
      { returnChanges: true }
    ).run(conn);
  if (replaced !== 1) {
    throw new Error('Allocating database storage failed. ' +
      `No databases of type ${type} available.`
    );
  }
  return addID('Storage', changes[0].new_val);
}
