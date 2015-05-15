import {Record} from 'immutable';

/**
 * Selects from table
 *
 * @implements Selector
 * @param tableName - table to select from
 *
 * @method toReQL(db)
 */
export default class AllSelector extends Record({
  tableName: undefined,
}) {
  toReQL(db) {
    return db.table(this.tableName);
  }
}
