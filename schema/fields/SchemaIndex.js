import {Record, List} from 'immutable';

export default class SchemaIndex extends Record({
  name: undefined,
  fields: List(),
}) {}
