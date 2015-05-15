import {Record} from 'immutable';
import getSchemaQuery from './getSchemaQuery';

/**
 * Selects schema
 *
 * @implements Selector
 *
 * @method toReQL(db)
 */
export default class SchemaSelector extends Record({
}) {
  toReQL(db) {
    return getSchemaQuery(db);
  }
}
