import Immutable from 'immutable';

/**
 * Selects from the table filtering by id of the given object.
 *
 * NB: obj is mandatory for toReQL()
 *
 * @implements Selector
 * @param tableName - table name to select from.
 * @param relatedField - field (and index) to filter through
 *
 * @method toReQL(db, {obj})
 */
export default class ReverseRelatedSelector extends Immutable.Record({
  tableName: undefined,
  relatedField: undefined,
}) {
  toReQL(db, {obj}) {
    let table = db.table(this.tableName);
    let query = table.getAll(obj('id'), {index: this.relatedField});
    return query;
  }
}
