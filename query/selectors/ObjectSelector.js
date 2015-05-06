import {Record, Map} from 'immutable';

/**
 * Selector that returns a literal object passed to it.
 *
 * @implements Selector
 * @params object - Immutable.Map() with only primitive values.
 *
 * @method toReQL(r, db, {single})
 */
export default class ObjectSelector extends Record({
  object: Map(),
}) {
  toReQL(r, db, {single}) {
    if (single) {
      return r(this.object.toJS());
    } else {
      return r([this.object.toJS()]);
    }
  }
}
