import {fromJS} from 'immutable';
import getBaseTypes from '../schema/getBaseTypes';
import dbToSchema from '../schema/dbToSchema';

const testSchema = dbToSchema(
  getBaseTypes().updateIn(['types'], (types) => {
    return types.concat(fromJS([
      {
        name: 'User',
        isNode: true,
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
        isNode: true,
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
    ]));
  })
);

export default testSchema;
