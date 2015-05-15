import {Record} from 'immutable';
import getSchemaQuery from './getSchemaQuery';

/**
 * Selects one type from schema
 *
 * @implements Selector
 * @params name - type name
 *
 * @method toReQL(db)
 */
export default class TypeSelector extends Record({
  name: undefined,
}) {
  toReQL(db) {
    return getSchemaQuery(db)('types')
      .filter({name: this.name})
      .nth(0);
  }
}
