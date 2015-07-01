import {fromJS} from 'immutable';
import RethinkDB from 'rethinkdb';

import {SECRET_TABLE, TYPE_TABLE} from '../query/QueryConstants';

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
      {
        author: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
        createdAt: new Date('2015-04-11T10:24:52.163Z'),
        text: 'Test text 2',
      },
      {
        author: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
        createdAt: new Date('2015-04-12T10:24:52.163Z'),
        text: 'Test text 3',
      },
      {
        author: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
        createdAt: new Date('2015-04-13T10:24:52.163Z'),
        text: 'Test text 4',
      },

    ],
    [SECRET_TABLE]: [
      {
        value: 'secret',
      },
    ],
    [TYPE_TABLE]: [
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
        indexes: [
          {
            name: 'id',
            fields: [
              {
                name: 'id',
              },
            ],
          },
        ],

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
        indexes: [
          {
            name: 'id',
            fields: [
              {
                name: 'id',
              },
            ],
          },
          {
            name: 'author',
            fields: [
              {
                name: 'author',
              },
            ],
          },
        ],
      },
    ],
  },
});

export function createEmptyDatabase(conn, dbName) {
  return RethinkDB.dbCreate(dbName).run(conn);
}

export async function createTestDatabase(conn, dbName) {
  await createEmptyDatabase(conn, dbName);
  await* TEST_DATA.get('tables').map(async function (data, table) {
    const options = {};
    if (table === TYPE_TABLE) {
      options.primaryKey = 'name';
    }
    await RethinkDB.db(dbName).tableCreate(table, options).run(conn);
    await RethinkDB.db(dbName)
      .table(table)
      .insert(data.toJS())
      .run(conn);
  });
  await* TEST_DATA.get('tables').get(TYPE_TABLE).map(async function (type) {
    const table = type.get('name');
    const indexes = type.get('indexes');
    await* indexes.map(async function (index) {
      const name = index.get('name');
      if (name === 'id') {
        return;
      }
      const fields = index.get('fields');
      let indexFields;
      if (fields.count() > 1) {
        indexFields = fields.map((field) => (
          RethinkDB.row(field.get('name'))
        )).toArray();
      } else {
        indexFields = RethinkDB.row(fields.first().get('name'));
      }
      await RethinkDB
        .db(dbName)
        .table(table)
        .indexCreate(name, indexFields)
        .run(conn);
      await RethinkDB
        .db(dbName)
        .table(table)
        .indexWait(name)
        .run(conn);
    });
  });
}

export async function deleteTestDatabase(conn, dbName) {
  await RethinkDB.dbDrop(dbName).run(conn);
}
