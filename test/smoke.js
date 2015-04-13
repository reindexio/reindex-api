import Immutable from 'immutable';
import assert from './assert';
import uuid from 'uuid';
import r from 'rethinkdb';
import co from 'co';
import * as schema from '../schema/schema';
import Parser from '../graphQL/Parser';
import graphQLToQuery from '../query/graphQLToQuery';
import Query from '../query/Query';
import IDSelector from '../query/selectors/IDSelector';
import {createTestDatabase, deleteTestDatabase} from './testDatabase';

function makeRootCall(tableName) {
  return function tableRootCall() {
    return {
      preQueries: Immutable.List(),
      query: new Query({
        table: tableName,
      }),
      rootName: tableName,
    };
  };
}

function getById(q, node, call) {
  return q.set('selector', new IDSelector({
    ids: call.parameters,
  }));
}

describe('SmokeTest', () => {
  let dbName = 'testdb' + uuid.v4().replace(/-/g, '_');
  let testSchema = new schema.Schema({
    rootCalls: Immutable.Map({
      User: makeRootCall('User'),
      Micropost: makeRootCall('Micropost'),
    }),
    calls: Immutable.Map({
      '__call__': getById,
    }),
    tables: Immutable.Map({
      User: Immutable.Map({
        handle: new schema.SchemaPrimitiveField({
          name: 'handle',
          type: schema.SCHEMA_TYPES.string,
        }),
        microposts: new schema.SchemaConnectionListField({
          name: 'microposts',
          reverseName: 'author',
          target: 'Micropost',
        }),
      }),
      Micropost: Immutable.Map({
        text: new schema.SchemaPrimitiveField({
          name: 'text',
          type: schema.SCHEMA_TYPES.string,
        }),
        createdAt: new schema.SchemaPrimitiveField({
          name: 'createdAt',
          type: schema.SCHEMA_TYPES.datetime,
        }),
        author: new schema.SchemaConnectionField({
          name: 'author',
          reverseName: 'microposts',
          target: 'User',
        }),
      }),
    }),
  });

  // let q1 = 'Micropost(f2f7fb49-3581-4caa-b84b-e9489eb47d84) { text, createdAt, author { handle }}';
  // let gql1 = Parser.parse(q1);
  // let rql1 = graphQLToQuery(testSchema, gql1);
  let q2 = 'User(bbd1db98-4ac4-40a7-b514-968059c3dbac) { handle, microposts { count, edges { text, createdAt }}}';
  let gql2 = Parser.parse(q2);
  let rql2 = graphQLToQuery(testSchema, gql2);

  before(co.wrap(function* () {
    let conn = yield r.connect();
    yield createTestDatabase(conn, dbName);
  }));

  after(co.wrap(function* () {
    let conn = yield r.connect();
    yield deleteTestDatabase(conn, dbName);
  }));

  it('Returns correct data', co.wrap(function* () {
    let conn = yield r.connect();

    let q = rql2.query.toReQL(r, r.db(dbName));
    let result = yield q.run(conn);

    assert.oequal(Immutable.fromJS(result), Immutable.fromJS([
      {
        handle: 'freiksenet',
        microposts: {
          count: 1,
          edges: [
            {
              createdAt: new Date('2015-04-10T10:24:52.163Z'),
              text: 'Test text',
            },
          ],
        },
      },
    ]));
  }));
});
