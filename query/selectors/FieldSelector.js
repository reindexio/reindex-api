import Immutable from 'immutable';

/**
 * Selects from object by path.
 *
 * @implements Selector
 * @param path - Immutable.List path
 *
 * @method toReQL(r, db, {obj})
 */
export default class FieldSelector extends Immutable.Record({
  path: Immutable.List(),
}) {
  toReQL(r, db, {obj} = {}) {
    return this.path.reduce((acc, next) => {
      return acc(next);
    }, obj || r.row);
  }
}
