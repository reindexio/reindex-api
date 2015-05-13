import {fromJS, Map} from 'immutable';
import assert from './assert';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';
import Parser from '../graphQL/Parser';
import graphQLToQuery from '../query/graphQLToQuery';
import {createTestDatabase, deleteTestDatabase} from './testDatabase';
import getSchema from '../schema/getSchema';

describe('Integration Tests', () => {
  let dbName = 'testdb' + uuid.v4().replace(/-/g, '_');

  before(async function () {
    let conn = await RethinkDB.connect();
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    let conn = await RethinkDB.connect();
    return await deleteTestDatabase(conn, dbName);
  });

  async function queryDB(rql) {
    let conn = await RethinkDB.connect();
    let schema = await getSchema(RethinkDB.db(dbName), conn);
    let q = graphQLToQuery(schema, Parser.parse(rql));
    q = q.toReQL(RethinkDB, RethinkDB.db(dbName));

    return fromJS(await q.run(conn));
  }

  it('Should return correct data for node(Micropost, <id>)', async function () {
    let result = await queryDB(
      `node(Micropost, f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        text,
        createdAt,
        author {
          handle
        }
      }`
    );

    assert.oequal(result, fromJS({
       'author': {
         'handle': 'freiksenet',
       },
       'createdAt': new Date('2015-04-10T10:24:52.163Z'),
       'text': 'Test text',
    }));
  });

  it('Should return correct data for node(User, <id>)', async function () {
    let result = await queryDB(
      `node(User, bbd1db98-4ac4-40a7-b514-968059c3dbac) {
        handle,
        microposts {
          count,
          nodes {
            createdAt,
            text
          }
        }
      }`
    );

    assert.oequal(result, fromJS(
      {
        'handle': 'freiksenet',
        'microposts': {
          'count': 1,
          'nodes': [
            {
              'createdAt': new Date('2015-04-10T10:24:52.163Z'),
              'text': 'Test text',
            },
          ],
        },
      }
    ));
  });

  it('Should return correct data for nodes(User)', async function () {
    let result = await queryDB(
      `nodes(User) {
        nodes {
          handle
        }
      }`
    );

    assert.oequal(result.get('nodes').toSet(), fromJS(
      [
        { 'handle': 'freiksenet'},
        { 'handle': 'fson' },
      ]
    ).toSet());
  });

  it('Should create and delete type.', async function () {
    assert.oequal(await queryDB(
      `createType(Test) { success }`
    ), Map({ success: true }));

    assert.oequal(await queryDB(
      `addField(Test, test, string) {
        success,
        changes {
          count,
          nodes {
            oldValue {
              name
            },
            newValue {
              name
            }
          }
        }
      }`
    ), fromJS({
      success: true,
      changes: {
        count: 1,
        nodes: [{
          oldValue: {
            name: 'Test',
          },
          newValue: {
            name: 'Test',
          },
        }, ],
      },
    }));

    assert.oequal(await queryDB(
      `removeField(Test, test) {
        success,
        changes {
          count,
          nodes {
            oldValue {
              name
            },
            newValue {
              name
            }
          }
        }
      }`
    ), fromJS({
      success: true,
      changes: {
        count: 1,
        nodes: [{
          oldValue: {
            name: 'Test',
          },
          newValue: {
            name: 'Test',
          },
        }, ],
      },
    }));

    assert.oequal(await queryDB(
      `deleteType(Test) { success }`
    ), Map({ success: true }));
  });
});
