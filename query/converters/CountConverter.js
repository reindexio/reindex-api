import {Record} from 'immutable';

/**
 * Converts query to count.
 *
 * @implements Converter
 */
export default class CountConverter extends Record({
}) {
  toReQL(db, query) {
    return query.count();
  }
}
