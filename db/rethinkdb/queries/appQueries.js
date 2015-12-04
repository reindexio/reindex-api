import RethinkDB from 'rethinkdb';
import { values } from 'lodash';

import * as DBTableNames from '../DBTableNames';

export async function createStorageForApp(conn, dbName) {
  await RethinkDB.dbCreate(dbName).run(conn);
  await* values(DBTableNames).map((tableName) =>
    RethinkDB.db(dbName).tableCreate(tableName).run(conn)
  );
  return true;
}

export async function deleteStorageForApp(conn, dbName) {
  await RethinkDB.dbDrop(dbName).run(conn);
}
