import RethinkDB from 'rethinkdb';
import rootCalls from '../rootCalls';
import BaseTypes from '../../schema/BaseTypes';

export default function getSchemaQuery(db) {
  let baseSchema = {
    calls: getRootCalls(),
    types: BaseTypes,
  };
  return RethinkDB.expr(baseSchema).merge((schema) => {
    return {
      types: db
        .table('_types')
        .without('id')
        .coerceTo('array')
        .union(schema('types')),
    };
  });
}

function getRootCalls() {
  return rootCalls.valueSeq().toJS();
}
