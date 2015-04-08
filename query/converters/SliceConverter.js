import Immutable from 'immutable';

/**
 * Slices the query from `from` to `to`.
 *
 * @implements Converter
 * @param from
 * @param to
 */
export default class SliceConverter extends Immutable.Record({
  from: 0,
  to: undefined,
}) {
  toReQL(r, db, query) {
    return query.slice(this.from, this.to);
  }
}
