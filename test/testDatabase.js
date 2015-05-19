import {fromJS} from 'immutable';
import RethinkDB from 'rethinkdb';

const TEST_DATA = fromJS({
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
    _types: [
      {
        name: 'User',
        isNode: true,
        fields: [
          {
            name: 'id',
            type: 'string',
          },
          {
            name: 'handle',
            type: 'string',
          },
          {
            name: 'microposts',
            type: 'connection',
            target: 'Micropost',
            reverseName: 'author',
          },
        ],
        parameters: [],
      },
      {
        name: 'Micropost',
        isNode: true,
        fields: [
          {
            name: 'id',
            type: 'string',
          },
          {
            name: 'text',
            type: 'string',
          },
           {
            name: 'createdAt',
            type: 'datetime',
          },
           {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
        parameters: [],
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

export function createEmptyDatabase(conn, dbName) {
  return RethinkDB.dbCreate(dbName).run(conn);
}

export async function createTestDatabase(conn, dbName) {
  await createEmptyDatabase(conn, dbName);
  await* TEST_DATA.get('tables').map(async function (data, table) {
    let options = {};
    if (table === '_types') {
      options.primaryKey = 'name';
    }
    await RethinkDB.db(dbName).tableCreate(table, options).run(conn);
    await RethinkDB.db(dbName)
      .table(table)
      .insert(data.toJS())
      .run(conn);
  });
  await* TEST_DATA.get('indexes').map(async function (index) {
    const table = index.get('table');
    const field = index.get('field');
    await RethinkDB
      .db(dbName)
      .table(table)
      .indexCreate(field)
      .run(conn);
    await RethinkDB
      .db(dbName)
      .table(table)
      .indexWait(field)
      .run(conn);
  });
}

export async function deleteTestDatabase(conn, dbName) {
  await RethinkDB.dbDrop(dbName).run(conn);
}
