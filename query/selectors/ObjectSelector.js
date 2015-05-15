import {Record, Map} from 'immutable';
import RethinkDB from 'rethinkdb';

/**
 * Selector that returns a literal object passed to it.
 *
 * @implements Selector
 * @params object - Immutable.Map() with only primitive values.
 *
 * @method toReQL(db)
 */
export default class ObjectSelector extends Record({
  object: Map(),
}) {
  toReQL() {
    return RethinkDB.expr(this.object.toJS());
  }
}
