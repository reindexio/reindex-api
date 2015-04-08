import Immutable from 'immutable';

/**
 * Selects from table by ids.
 *
 * @implements Selector
 * @param ids - Immutable.List() of ids.
 *
 * @method toReQL(r, db, {tableName, single})
 */
export default class IDSelector extends Immutable.Record({
  ids: Immutable.List(),
}) {
  toReQL(r, db, {tableName, single}) {
    let table = db.table(tableName);
    if (single) {
      return table.get(this.ids.first());
    } else {
      return table.getAll(...this.ids);
    }
  }
}
