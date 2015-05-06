import Immutable from 'immutable';

/**
 * Selects from table
 *
 * @implements Selector
 *
 * @method toReQL(r, db, {tableName})
 */
export default class AllSelector extends Immutable.Record({
}) {
  toReQL(r, db, {tableName}) {
    return db.table(tableName);
  }
}
