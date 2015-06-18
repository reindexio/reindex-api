import RethinkDB from 'rethinkdb';
import getBaseTypes from '../../schema/getBaseTypes';

import {TYPE_TABLE} from '../QueryConstants';

export default function getSchemaQuery(db) {
  const baseSchema = getBaseTypes().toJS();
  return RethinkDB.expr(baseSchema).merge((schema) => ({
    types: db
      .table(TYPE_TABLE)
      .without('id')
      .merge({
        parameters: [],
      })
      .coerceTo('array')
      .union(schema('types'))
      .merge((type) => ({
        fields: type('fields').prepend({
          name: '__type__',
          type: 'type',
        }),
      })),
    }));
}
