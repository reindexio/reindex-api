import {Record} from 'immutable';

/**
 * Slices the query from `from` to `to`.
 *
 * @implements Converter
 * @param from
 * @param to
 */
export default class SliceConverter extends Record({
  from: 0,
  to: undefined,
}) {
  toReQL(db, query) {
    let args = [this.from];
    if (this.to) {
      args.push(this.to);
    }
    return query.slice(...args);
  }
}
