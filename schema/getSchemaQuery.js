import RethinkDB from 'rethinkdb';
import rootCalls from '../query/rootCalls';

function getRootCalls() {
  return rootCalls.toJS();
}

function getBaseTypes() {
  return [
    {
      name: 'connection',
      fields: [
        {
          name: 'edges',
          type: 'edges',
        }, {
          name: 'count',
          type: 'count',
        },
      ],
      methods: [
        {
          name: 'get',
          arguments: [
            {
              name: 'ids',
              type: 'array',
              childType: {
                type: 'string',
              },
            },
          ],
          returns: 'connection',
        },
      ],
    }, {
      name: 'edges',
      fields: [
        {
          name: 'cursor',
          type: 'cursor',
        }, {
          name: 'node',
          type: 'object',
        },
      ],
    },
  ];
}

export default function getSchemaQuery(db) {
  let baseSchema = {
    calls: getRootCalls(),
    types: getBaseTypes(),
  };
  let expr = RethinkDB.expr(baseSchema).merge((schema) => {
    return {
      types: db
        .table('_types')
        .without('id')
        .coerceTo('array')
        .union(schema('types')),
    };
  });
  return expr;
}
