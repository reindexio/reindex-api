import {Record, Map} from 'immutable';

export default class SchemaType extends Record({
  name: undefined,
  isNode: false,
  fields: Map(),
  indexes: Map(),
}) {
}
