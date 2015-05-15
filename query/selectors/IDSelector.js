import {Record} from 'immutable';

/**
 * Selects from table by ids.
 *
 * @implements Selector
 * @param tableName - table name to select from.
 * @param id - id to select
 *
 * @method toReQL(db)
 */
export default class IDSelector extends Record({
  tableName: undefined,
  id: undefined,
}) {
  toReQL(db) {
    let table = db.table(this.tableName);
    return table.get(this.id);
  }
}
