import Immutable from 'immutable';
import r from 'rethinkdb';

const TEST_DATA = Immutable.fromJS({
  tables: {
    User: [
      {id: '94b90d89-22b6-4abf-b6ad-2780bf9d0408', handle: 'fson'},
      {id: 'bbd1db98-4ac4-40a7-b514-968059c3dbac', handle: 'freiksenet'},
    ],
    Micropost: [
      {
        author: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
        createdAt: new Date('2015-04-10T10:24:52.163Z'),
        text: 'Test text',
      },
    ],
  },
  indexes: [
    {
      table: 'Micropost',
      field: 'author',
    },
  ],
});

export function* createTestDatabase(conn, dbName) {
  yield r.dbCreate(dbName).run(conn);
  yield* TEST_DATA.get('tables').map(function* (data, table) {
    yield r.db(dbName).tableCreate(table).run(conn);
    yield r
      .db(dbName)
      .table(table)
      .insert(data.toJS())
      .run(conn);
  });
  yield* TEST_DATA.get('indexes').map(function* (index) {
    let table = index.get('table');
    let field = index.get('field');
    yield r
      .db(dbName)
      .table(table)
      .indexCreate(field)
      .run(conn);
    yield r
      .db(dbName)
      .table(table)
      .indexWait(field)
      .run(conn);
  });
}

export function* deleteTestDatabase(conn, dbName) {
  yield r.dbDrop(dbName).run(conn);
}
