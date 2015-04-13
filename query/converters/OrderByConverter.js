import Immutable from 'immutable';

/**
 * Converts query to ordered one.
 *
 * @implements Converter
 * @param orderBy - field to order by, if prefixed with `-` then
     sorts descending
 */
export default class OrderByConverter extends Immutable.Record({
  orderBy: '',
}) {
  toReQL(r, db, query) {
    let orderBy;
    if (this.orderBy[0] === '-') {
      orderBy = r.desc(this.orderBy.slice(1));
    } else {
      orderBy = r.asc(this.orderBy);
    }
    return query.orderBy(orderBy);
  }
}
