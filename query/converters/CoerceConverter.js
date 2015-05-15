import {Record} from 'immutable';

/**
 * Coerces query.
 *
 * @implements Converter
 * @param to - type to coerce to.
 */
export default class CoerceConverter extends Record({
  to: '',
}) {
  toReQL(db, query) {
    return query.coerceTo(this.to);
  }
}
