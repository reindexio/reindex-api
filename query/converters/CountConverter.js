import Immutable from 'immutable';

/**
 * Converts query to count.
 *
 * @implements Converter
 */
export default class CountConverter extends Immutable.Record({
}) {
  toReQL(r, db, query) {
    return query.count();
  }
}
