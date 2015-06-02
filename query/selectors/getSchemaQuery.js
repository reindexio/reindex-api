import RethinkDB from 'rethinkdb';
import getBaseTypes from '../../schema/getBaseTypes';

export default function getSchemaQuery(db) {
  let baseSchema = getBaseTypes().toJS();
  return RethinkDB.expr(baseSchema).merge((schema) => ({
    types: db
      .table('_types')
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
