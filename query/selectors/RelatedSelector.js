import Immutable from 'immutable';

/**
 * Selects from a table using id(s) from field.
 *
 * @implements Selector
 * @param relatedField - field to get id(s) from
 *
 * @method toReQL(r, db, {tableName, single, obj})
 */
export default class RelatedSelector extends Immutable.Record({
  relatedField: '',
}) {
  toReQL(r, db, {tableName, single, obj}) {
    let table = db.table(tableName);
    let selector = obj || r.row;
    if (single) {
      return table.get(selector(this.relatedField));
    } else {
      return table.getAll(selector(this.relatedField));
    }
  }
}
