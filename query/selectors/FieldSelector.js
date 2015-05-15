import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

/**
 * Selects from object by path.
 *
 * @implements Selector
 * @param path - Immutable.List path
 *
 * @method toReQL(db, {obj})
 */
export default class FieldSelector extends Record({
  path: undefined,
}) {
  toReQL(db, {obj} = {}) {
    return this.path.reduce((acc, next) => {
      return acc(next);
    }, obj || RethinkDB.row);
  }
}
