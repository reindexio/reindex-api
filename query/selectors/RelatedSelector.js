import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

/**
 * Selects from a table using id(s) from field.
 *
 * @implements Selector
 * @param relatedField - field to get id(s) from
 *
 * @method toReQL(db, {tableName, single, obj})
 */
export default class RelatedSelector extends Record({
  tableName: undefined,
  relatedField: undefined,
}) {
  toReQL(db, {obj} = {}) {
    let table = db.table(this.tableName);
    let selector = obj || RethinkDB.row;
    return table.get(selector(this.relatedField));
  }
}
