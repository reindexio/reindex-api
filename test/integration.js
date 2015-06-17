import {fromJS, Set} from 'immutable';
import assert from './assert';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';
import Parser from '../graphQL/Parser';
import graphQLToQuery from '../query/graphQLToQuery';
import rootCalls from '../query/rootCalls';
import {createTestDatabase, deleteTestDatabase} from './testDatabase';
import getSchema from '../schema/getSchema';

describe('Integration Tests', () => {
  let dbName = 'testdb' + uuid.v4().replace(/-/g, '_');
  let conn;

  before(async function () {
    conn = await RethinkDB.connect();
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    await deleteTestDatabase(conn, dbName);
    await conn.close();
  });

  async function runQuery(graphQLQuery) {
    const schema = await getSchema(RethinkDB.db(dbName), conn);
    const query = graphQLToQuery(schema, Parser.parse(graphQLQuery));
    const reQLQuery = query.toReQL(RethinkDB.db(dbName));
    return await reQLQuery.run(conn);
  }

  async function queryDB(graphQLQuery) {
    return fromJS(await runQuery(graphQLQuery));
  }

  it('Should return correct data for node(Micropost, <id>)', async function () {
    let result = await queryDB(
      `node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        text,
        createdAt,
        author as beautifulPerson {
          handle as nickname
        }
      }`
    );

    assert.oequal(result, fromJS({
      node: {
        beautifulPerson: {
          nickname: 'freiksenet',
        },
        createdAt: new Date('2015-04-10T10:24:52.163Z'),
        text: 'Test text',
      },
    }));
  });

  it('Should return correct data for node(User, <id>)', async function () {
    let result = await queryDB(
      `node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) {
        handle,
        microposts(orderBy: createdAt, first: 1) as posts {
          count,
          nodes {
            createdAt,
            text
          }
        },
        microposts {
          count
        }
      }`
    );

    assert.oequal(result, fromJS({
      node: {
        handle: 'freiksenet',
        posts: {
          count: 4,
          nodes: [
            {
              createdAt: new Date('2015-04-10T10:24:52.163Z'),
              text: 'Test text',
            },
          ],
        },
        microposts: {
          count: 4,
        },
      },
    }));
  });

  it('Should allow querying connections with only a count', async function () {
    let result = await queryDB(
      `node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) as best {
        microposts {
          count
        }
      }`
    );

    assert.oequal(result, fromJS({
      best: {
        microposts: {
          count: 4,
        },
      },
    }));

    result = await queryDB(
      `nodes(type: User) {
        objects {
          count
        }
      }`
    );

    assert.oequal(result, fromJS({
      nodes: {
        objects: {
          count: 2,
        },
      },
    }));
  });

  it('Should return correct data for nodes(User)', async function () {
    let result = await queryDB(
      `nodes(type: User) {
        objects(orderBy: handle, first: 1) as firstObject {
          nodes as stuff {
            handle as name
          }
        },
        objects(orderBy: handle) {
          nodes {
            handle,
          }
        }
      }`
    );

    assert.oequal(result, fromJS({
      nodes: {
        firstObject: {
          stuff: [
            { name: 'freiksenet' },
          ],
        },
        objects: {
          nodes: [
            { handle: 'freiksenet' },
            { handle: 'fson' },
          ],
        },
      },
    }));
  });

  it('Should be able to use edges and cursor', async function () {
    let result = await queryDB(
      `nodes(type: User) {
        objects(orderBy: handle, first: 1) {
          edges as stuff {
            node as data {
              handle
            }
          }
        }
      }
    `);

    assert.oequal(result, fromJS({
      nodes: {
        objects: {
          stuff: [
            {
              data: {
                handle: 'freiksenet',
              },
            },
          ],
        },
      },
    }));
  });

  it('Should return type information with __type__', async function() {
    let result = await queryDB(
      `nodes(type: User) {
        __type__ {
          name
        },
        objects(orderBy: handle, first: 1) {
          __type__ {
            name,
            parameters(orderBy: name) {
              nodes {
                name
              }
            }
          },
          nodes {
            __type__ {
              name,
              fields(orderBy: name) {
                nodes {
                  name
                }
              }
            },
            handle
          }
        }
      }`
    );

    assert.oequal(result, fromJS({
      nodes: {
        __type__: {
          name: 'nodesResult',
        },
        objects: {
          __type__: {
            name: 'connection',
            parameters: {
              nodes: [
                { name: 'after' },
                { name: 'first' },
                { name: 'orderBy' },
              ],
            },
          },
          nodes: [
            {
              __type__: {
                name: 'User',
                fields: {
                  nodes: [
                    { name: '__type__' },
                    { name: 'handle' },
                    { name: 'id' },
                    { name: 'microposts' },
                  ],
                },
              },
              handle: 'freiksenet',
            },
          ],
        },
      },
    }));

    result = await queryDB(`
      node(type: User, id: bbd1db98-4ac4-40a7-b514-968059c3dbac) {
        __type__ {
          name
        },
        microposts(first: 1) {
          __type__ {
            name
          },
          nodes {
            __type__ {
              name
            }
          }
        }
      }
    `);

    assert.oequal(result, fromJS({
      node: {
        __type__: {
          name: 'User',
        },
        microposts: {
          __type__: {
            name: 'connection',
          },
          nodes: [
            {
              __type__: {
                name: 'Micropost',
              },
            },
          ],
        },
      },
    }));
  });

  it('Should get type information with schema() and type()', async function () {
    let schemaResult = await queryDB(`
      schema() {
        calls(orderBy: name) {
          nodes {
            name
          }
        },
        types(orderBy: name) as stuff {
          nodes {
            name,
            isNode,
            fields {
              nodes {
                name,
                type
              }
            },
            parameters {
              nodes {
                name,
                type
              }
            }
          }
        }
      }`
    );

    let callNames = schemaResult
      .getIn(['schema', 'calls', 'nodes'])
      .map((call) => call.get('name'))
      .toSet();
    assert.oequal(callNames, rootCalls.keySeq().toSet());

    assert.oequal(
      schemaResult.getIn(['schema', 'stuff', 'nodes']).toSet(),
      Set(fromJS([
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
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
              },
            ],
          },
          isNode: true,
          name: 'User',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
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
              },
            ],
          },
          isNode: true,
          name: 'Micropost',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'edges',
                type: 'edges',
              },
              {
                name: 'count',
                type: 'count',
              },
              {
                name: 'nodes',
                type: 'nodes',
              },
            ],
          },
          name: 'connection',
          parameters: {
            nodes: [
              {
                name: 'first',
                type: 'integer',
              }, {
                name: 'after',
                type: 'integer',
              }, {
                name: 'orderBy',
                type: 'string',
              },
            ],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'cursor',
                type: 'cursor',
              },
              {
                name: 'node',
                type: 'node',
              },
            ],
          },
          name: 'edges',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'objects',
                type: 'connection',
              },
            ],
          },
          name: 'nodesResult',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'success',
                type: 'boolean',
              },
            ],
          },
          name: 'schemaResult',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'success',
                type: 'boolean',
              },
              {
                name: 'changes',
                type: 'array',
              },
            ],
          },
          name: 'mutationResult',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'id',
                type: 'string',
              },
              {
                name: 'value',
                type: 'string',
              },
            ],
          },
          name: 'secret',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'calls',
                type: 'array',
              },
              {
                name: 'types',
                type: 'array',
              },
            ],
          },
          name: 'schema',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'name',
                type: 'string',
              },
              {
                name: 'returns',
                type: 'string',
              },
              {
                name: 'parameters',
                type: 'array',
              },
            ],
          },
          name: 'call',
          parameters: {
            nodes: [],
          },
        },
        {
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'name',
                type: 'string',
              },
              {
                name: 'isNode',
                type: 'boolean',
              },
              {
                name: 'fields',
                type: 'array',
              },
              {
                name: 'parameters',
                type: 'array',
              },
            ],
          },
          name: 'type',
          parameters: {
            nodes: [],
          },
        },
        {
          name: 'changes',
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'oldValue',
                type: 'object',
              },
              {
                name: 'newValue',
                type: 'object',
              },
            ],
          },
          parameters: {
            nodes: [],
          },
        },
        {
          name: 'field',
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'name',
                type: 'string',
              },
              {
                name: 'type',
                type: 'string',
              },
              {
                name: 'target',
                type: 'string',
              },
              {
                name: 'reverseName',
                type: 'string',
              },
            ],
          },
          parameters: {
            nodes: [],
          },
        },
        {
          name: 'parameter',
          fields: {
            nodes: [
              {
                name: '__type__',
                type: 'type',
              },
              {
                name: 'name',
                type: 'string',
              },
              {
                name: 'type',
                type: 'string',
              },
              {
                name: 'isRequired',
                type: 'boolean',
              },
            ],
          },
          parameters: {
            nodes: [],
          },
        },
      ])
    ));

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
      type: {
        name: 'User',
        isNode: true,
        fields: {
          nodes: [
            {
              name: '__type__',
              type: 'type',
            },
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
            },
          ],
        },
      },
    }));
  });

  it('Should do schema modifications', async function () {
    assert.oequal(await queryDB(
      `createType(name: Test) { success }`
    ), fromJS({
      createType: {
       success: true,
      },
    }));

    assert.oequal(await queryDB(
      `createField(type: Test, fieldName: test, fieldType: string) {
        success,
        changes {
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
      createField: {
        success: true,
        changes: {
          nodes: [
            {
              oldValue: {
                name: 'Test',
              },
              newValue: {
                name: 'Test',
              },
            },
          ],
        },
      },
    }));

    assert.oequal(await queryDB(
      `deleteField(type: Test, fieldName: test) {
        success,
        changes as updates {
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
      deleteField: {
        success: true,
        updates: {
          nodes: [{
            oldValue: {
              name: 'Test',
            },
            newValue: {
              name: 'Test',
            },
          }, ],
        },
      },
    }));

    assert.oequal(await queryDB(
      `createConnection(type: User, targetType: Micropost,
                     fieldName: reviewedPosts,
                     targetFieldName: reviewedBy) {
         success,
         changes {
           count
         }
       }`
    ), fromJS({
      createConnection: {
        success: true,
        changes: {
          count: 2,
        },
      },
    }));

    assert.oequal(await queryDB(
      `deleteConnection(type: User, fieldName: reviewedPosts) {
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
      deleteConnection: {
        success: true,
        changes: {
          count: 2,
          nodes: [
            {
              newValue: {
                name: 'Micropost',
              },
              oldValue: {
                name: 'Micropost',
              },
            },
            {
              newValue: {
                name: 'User',
              },
              oldValue: {
                name: 'User',
              },
            },
          ],
        },
      },
    }));

    assert.oequal(await queryDB(
      `deleteType(name: Test) { success }`
    ), fromJS({
      deleteType: {
        success: true,
      },
    }));
  });

  it('Should create a secret', async function () {
    const result = await runQuery(`addSecret() { value }`);
    assert.match(result.addSecret.value, /^[a-zA-Z0-9_-]{40}$/);
  });

  it('Should be able to do CRUD', async function() {
    let createResult = await queryDB(
      `create(type: User, data: \\{"handle":"newUser"\\}) {
        id, handle
      }`
    );
    let id = createResult.getIn(['create', 'id']);
    assert.oequal((await queryDB(
      `node(type: User, id: ${id}) {
        id, handle
      }`
    )).get('node'), createResult.get('create'));

    let micropostResult = await queryDB(
      `create(type: Micropost, data:
        \\{"author": "${id}"\\, "text": "text"\\,
           "createdAt": "2014-05-07T18:00:00Z"\\}) {
        id, text, createdAt, author {
          handle
        }
      }`
    );
    let micropostId = micropostResult.getIn(['create', 'id']);
    assert.oequal((await queryDB(
      `node(type: Micropost, id: ${micropostId}) {
        id, text, createdAt, author {
          handle
        }
      }`
    )).get('node'), micropostResult.get('create'));

    let updateResult = await queryDB(
      `update(type: User, id: ${id}, data:
        \\{"handle": "mikhail"\\}) {
        id, handle
      }`
    );
    assert.oequal((await queryDB(
      `node(type: User, id: ${id}) {
        id, handle
      }`
    )).get('node'), updateResult.get('update'));

    let deleteResult = await queryDB(
      `delete(type: User, id: ${id}) {
        id
      }`
    );
    assert.equal(deleteResult.getIn(['delete', 'id']), id);

    try {
      await queryDB(
        `node(type: User, id: ${id}) {
          id, handle
        }`
      );
    } catch(e) {
      assert.ok(e);
      return;
    }
    assert.fail('', '', 'Expected retrieval of deleted node to fail');
  });
});
