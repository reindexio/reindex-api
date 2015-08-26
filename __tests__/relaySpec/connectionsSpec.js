/* eslint comma-dangle: 0, quotes: 0, quote-props: 0 */
import { fromJS, Map } from 'immutable';
import { graphql } from 'graphql';

import assert from '../../test/assert';
import createSchema from '../../graphQL/createSchema';
import injectDefaultFields from '../../graphQL/builtins/injectDefaultFields';
import typeFixtures from './fixtures/types.json';

const types = fromJS(typeFixtures.map((type) => {
  type.fields = injectDefaultFields(type);
  return type;
}));

const CURSOR_TYPE_NAME = 'Cursor';
const CONNECTION_TYPE_NAME = '_ExampleConnection';
const EDGE_TYPE_NAME = '_ExampleEdge';

class MockConnection {
  toString() {
    return '<MockConnection>';
  }
}

describe('Relay Cursor Connections Specification', () => {
  const schema = createSchema(types);
  const rootValue = {
    conn: new MockConnection(),
    indexes: Map(),
  };

  function runQuery(query, variables) {
    return graphql(schema, query, rootValue, variables);
  }

  describe('Connection', () => {
    it('passes introspection', async function() {
      const result = await runQuery(`
        query connectionIntrospection($name: String!) {
          __type(name: $name) {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }`,
        { name: CONNECTION_TYPE_NAME },
      );
      assert.deepProperty(result, 'data.__type.fields');
      const fields = result.data.__type.fields;
      assert.deepEqual(fields.filter((field) => field.name === 'edges'), [
        {
          "name": "edges",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": EDGE_TYPE_NAME,
              "kind": "OBJECT"
            }
          }
        }
      ], 'edges field should match');
      assert.deepEqual(fields.filter((field) => field.name === 'pageInfo'), [
        {
          "name": "pageInfo",
          "type": {
            "name": null,
            "kind": "NON_NULL",
            "ofType": {
              "name": "PageInfo",
              "kind": "OBJECT"
            }
          }
        }
      ], 'pageInfo field should match');
    });
  });

  describe('Edge', () => {
    it('passes introspection', async function() {
      const result = await runQuery(`
        query edgeIntrospection($name: String!) {
          __type(name: $name) {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }`,
        { name: EDGE_TYPE_NAME },
      );
      assert.deepProperty(result, 'data.__type.fields');
      const fields = result.data.__type.fields;
      assert.deepEqual(fields.filter((field) => field.name === 'node'), [
        {
          "name": "node",
          "type": {
            "name": "Example",
            "kind": "OBJECT",
            "ofType": null
          }
        },
      ], 'node field should match');
      assert.deepEqual(fields.filter((field) => field.name === 'cursor'), [
        {
          "name": "cursor",
          "type": {
            "name": null,
            "kind": "NON_NULL",
            "ofType": {
              "name": CURSOR_TYPE_NAME,
              "kind": "SCALAR"
            }
          }
        }
      ], 'cursor field should match');
    });
  });

  describe('PageInfo', () => {
    it('passes introspection', async function() {
      const result = await runQuery(`{
        __type(name: "PageInfo") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }`);
      assert.deepEqual(
        result,
        {
          "data": {
            "__type": {
              "fields": [
                // May contain other fields.
                {
                  "name": "hasNextPage",
                  "type": {
                    "name": null,
                    "kind": "NON_NULL",
                    "ofType": {
                      "name": "Boolean",
                      "kind": "SCALAR"
                    }
                  }
                },
                {
                  "name": "hasPreviousPage",
                  "type": {
                    "name": null,
                    "kind": "NON_NULL",
                    "ofType": {
                      "name": "Boolean",
                      "kind": "SCALAR"
                    }
                  }
                }
              ]
            }
          }
        }
      );
    });
  });
});
