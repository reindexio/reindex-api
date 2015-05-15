import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

/**
 * Converts query to ordered one.
 *
 * @implements Converter
 * @param orderBy - field to order by, if prefixed with `-` then
     sorts descending
 */
export default class OrderByConverter extends Record({
  orderBy: '',
}) {
  toReQL(db, query) {
    let orderBy;
    if (this.orderBy[0] === '-') {
      orderBy = RethinkDB.desc(this.orderBy.slice(1));
    } else {
      orderBy = RethinkDB.asc(this.orderBy);
    }
    return query.orderBy(orderBy);
  }
}
