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
    _types: [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'string',
          },
          {
            name: 'handle',
            types: 'string',
          },
          {
            name: 'microposts',
            type: 'connection',
            target: 'Micropost',
            reverseName: 'author',
          },
        ],
      },
      {
        name: 'Micropost',
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

export async function createTestDatabase(conn, dbName) {
  await r.dbCreate(dbName).run(conn);
  await* TEST_DATA.get('tables').map(async function (data, table) {
    await r.db(dbName).tableCreate(table).run(conn);
    await r.db(dbName)
      .table(table)
      .insert(data.toJS())
      .run(conn);
  });
  await* TEST_DATA.get('indexes').map(async function (index) {
    const table = index.get('table');
    const field = index.get('field');
    await r
      .db(dbName)
      .table(table)
      .indexCreate(field)
      .run(conn);
    await r
      .db(dbName)
      .table(table)
      .indexWait(field)
      .run(conn);
  });
}

export async function deleteTestDatabase(conn, dbName) {
  await r.dbDrop(dbName).run(conn);
}
