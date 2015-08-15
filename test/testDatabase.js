import {fromJS, List} from 'immutable';
import RethinkDB from 'rethinkdb';

import {
  AUTHENTICATION_PROVIDER_TABLE,
  SECRET_TABLE,
  TYPE_TABLE,
  USER_TABLE
} from '../db/DBConstants';

export const TEST_DATA = fromJS({
  tables: {
    User: [
      {id: '94b90d89-22b6-4abf-b6ad-2780bf9d0408', handle: 'fson'},
      {id: 'bbd1db98-4ac4-40a7-b514-968059c3dbac', handle: 'freiksenet'},
    ],
    Micropost: [
      {
        author: {
          value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
          type: 'User',
        },
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
        createdAt: new Date('2015-04-10T10:24:52.163Z'),
        text: 'Test text',
        tags: [],
      },
      {
        author: {
          value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
          type: 'User',
        },
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d82',
        createdAt: new Date('2015-04-11T10:24:52.163Z'),
        text: 'Test text 2',
        tags: ['test', 'two'],
      },
      {
        author: {
          value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
          type: 'User',
        },
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d83',
        createdAt: new Date('2015-04-12T10:24:52.163Z'),
        text: 'Test text 3',
        tags: ['test', 'three'],
      },
      {
        author: {
          value: 'bbd1db98-4ac4-40a7-b514-968059c3dbac',
          type: 'User',
        },
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d80',
        createdAt: new Date('2015-04-13T10:24:52.163Z'),
        text: 'Test text 4',
        tags: ['test', 'four'],
      },
    ],
    [AUTHENTICATION_PROVIDER_TABLE]: [
      {
        id: 'f2f7fb49-3581-4eou-b84b-e9489eb47d80',
        type: 'github',
        clientID: 'fakeClientId',
        clientSecret: 'fakeClientSecret',
        isEnabled: true,
      },
    ],
    [USER_TABLE]: [],
    [SECRET_TABLE]: [
      {
        value: 'secret',
      },
    ],
    [TYPE_TABLE]: [
      {
        kind: 'OBJECT',
        name: 'Category',
        interfaces: [],
        fields: [
          {
            name: 'name',
            type: 'string',
          },
        ],
        indexes: [],
      },
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['ReindexNode'],
        fields: [
          {
            name: 'id',
            type: 'id',
          },
          {
            name: 'handle',
            type: 'string',
          },
          {
            name: 'email',
            type: 'string',
          },
          {
            name: 'microposts',
            type: 'connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
        indexes: [],
      },
      {
        kind: 'OBJECT',
        name: 'Micropost',
        interfaces: ['ReindexNode'],
        fields: [
          {
            name: 'id',
            type: 'id',
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
          {
            name: 'tags',
            type: 'list',
            ofType: 'string',
          },
          {
            name: 'categories',
            type: 'list',
            ofType: 'Category',
          },
          {
            name: 'mainCategory',
            type: 'Category',
          },
        ],
        indexes: [
          {
            name: 'author',
            fields: ['author', 'value'],
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
  }).toArray();
  await* TEST_DATA.get('tables').get(TYPE_TABLE).map(async function (type) {
    const table = type.get('name');
    const indexes = type.get('indexes') || List();
    await* indexes.map(async function (index) {
      const name = index.get('name');
      const fields = index.get('fields');
      const indexDefinition = fields.rest().reduce(
        (acc, field) => acc(field),
        RethinkDB.row(fields.first())
      );
      await RethinkDB
        .db(dbName)
        .table(table)
        .indexCreate(name, indexDefinition)
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
