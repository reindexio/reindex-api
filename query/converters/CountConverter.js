import Immutable from 'immutable';

/**
 * Converts query to count.
 *
 * @implements Converter
 */
export default class CountConverter extends Immutable.Record({
}) {
  toReQL(db, query) {
    return query.count();
  }
}
