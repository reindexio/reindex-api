import {fromJS} from 'immutable';
import dbToSchema from '../schema/dbToSchema';

const testSchema = dbToSchema(fromJS({
  calls: [
    {
      name: 'node',
      args: [
        {
          name: 'typeName',
          type: 'string',
        }, {
          name: 'id',
          type: 'string',
        },
      ],
      returns: 'object',
    }, {
      name: 'nodes',
      args: [
        {
          name: 'typeName',
          type: 'string',
        },
      ],
      returns: 'connection',
    },
  ],
  types: [
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
    }, {
      name: 'User',
      node: true,
      fields: [
        {
          name: 'handle',
          type: 'string',
        }, {
          name: 'microposts',
          type: 'connection',
          target: 'Micropost',
          reverseName: 'author',
        },
      ],
    }, {
      name: 'Micropost',
      node: true,
      fields: [
        {
          name: 'text',
          type: 'string',
        }, {
          name: 'createdAt',
          type: 'datetime',
        }, {
          name: 'author',
          type: 'User',
          reverseName: 'microposts',
        },
      ],
    },
  ],
}));

export default testSchema;
