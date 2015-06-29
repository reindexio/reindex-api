import {fromJS} from 'immutable';
import createSchema from '../graphQL/createSchema';

const testSchema = createSchema(
  fromJS([
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
        }, {
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
    }, {
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
        }, {
          name: 'createdAt',
          type: 'datetime',
        }, {
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
      ],
    },
  ])
);


export default testSchema;
