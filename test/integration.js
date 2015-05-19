import {fromJS, Map, Set} from 'immutable';
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
    q = q.toReQL(RethinkDB.db(dbName));

    return fromJS(await q.run(conn));
  }

  it('Should return correct data for node(Micropost, <id>)', async function () {
    let result = await queryDB(
      `node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
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
      `node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) {
        handle,
        microposts(orderBy: -text, first: 2) {
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

  it('Should allow querying connections with only a count', async function () {
    let result = await queryDB(
      `node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) {
        microposts {
          count
        }
      }`
    );

    assert.oequal(result, fromJS(
      {
        'microposts': {
          'count': 1,
        },
      }
    ));
  });

  it('Should return correct data for nodes(User)', async function () {
    let result = await queryDB(
      `nodes(type: User) {
        objects(orderBy: handle, first: 1) {
          nodes {
            handle
          }
        }
      }`
    );

    assert.oequal(result.getIn(['objects', 'nodes']).toSet(), fromJS(
      [
        { 'handle': 'freiksenet'},
      ]
    ).toSet());
  });

  it('Should return type information', async function () {
    let schemaResult = await queryDB(
      `schema() {
        calls(orderBy: name) {
          nodes {
            name
          }
        },
        types {
          nodes {
            name,
            isNode
          }
        }
      }`
    );

    assert.oequal(schemaResult.getIn(['calls', 'nodes']), fromJS([
      {
        'name': 'addField',
      },
      {
        'name': 'addType',
      },
      {
        'name': 'node',
      },
      {
        'name': 'nodes',
      },
      {
        'name': 'removeField',
      },
      {
        'name': 'removeType',
      },
      {
        'name': 'schema',
      },
      {
        'name': 'type',
      },
    ]));

    assert.oequal(schemaResult.getIn(['types', 'nodes']).toSet(), Set(fromJS([
      {
        'name': 'Micropost',
        'isNode': true,
      },
      {
        'name': 'User',
        'isNode': true,
      },
      {
        'name': 'connection',
      },
      {
        'name': 'edges',
      },
      {
        'name': 'nodes',
      },
      {
        name: 'nodesResult',
      },
      {
        'name': 'schemaResult',
      },
      {
        'name': 'mutationResult',
      },
      {
        'name': 'schema',
      },
      {
        'name': 'call',
      },
      {
        'name': 'type',
      },
    ])));

    assert.oequal(await queryDB(
      `type(name: User) {
        name,
        isNode,
        fields {
          nodes {
            name,
            type
          }
        }
      }`
    ), fromJS({
      name: 'User',
      isNode: true,
      fields: {
        nodes: [
          {
            'name': 'id',
            'type': 'string',
          },
          {
            'name': 'handle',
            'type': 'string',
          },
          {
            'name': 'microposts',
            'type': 'connection',
          },
        ],
      },
    }));
  });

  it('Should create and delete type.', async function () {
    assert.oequal(await queryDB(
      `addType(name: Test) { success }`
    ), Map({ success: true }));

    assert.oequal(await queryDB(
      `addField(type: Test, fieldName: test, fieldType: string) {
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
      `removeField(type: Test, fieldName: test) {
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
      `removeType(name: Test) { success }`
    ), Map({ success: true }));
  });
});
