import Immutable from 'immutable';

/**
 * Selects from the table filtering by id of the given object.
 *
 * NB: obj is mandatory for toReQL()
 *
 * @implements Selector
 * @param relatedField - field (and index) to filter through
 *
 * @method toReQL(r, db, {tableName, single, obj})
 */
export default class ReverseRelatedSelector extends Immutable.Record({
  relatedField: '',
}) {
  toReQL(r, db, {tableName, single, obj}) {
    let table = db.table(tableName);
    let query = table.getAll(obj('id'), {index: this.relatedField});
    if (single) {
      return query.nth(0);
    } else {
      return query;
    }
  }
}
