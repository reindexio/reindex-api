import RethinkDB from 'rethinkdb';
import rootCalls from '../query/rootCalls';
import BaseTypes from './BaseTypes';

function getRootCalls() {
  return rootCalls.toJS();
}

export default function getSchemaQuery(db) {
  let baseSchema = {
    calls: getRootCalls(),
    types: BaseTypes,
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
