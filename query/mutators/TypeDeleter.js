import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class TypeDeleter extends Record({
  name: undefined,
}) {
  toReQL(r, db) {
    return RethinkDB.do(db.table('_types').get(this.name).delete(), () => {
      return RethinkDB.do(db.tableDrop(this.name), (result) => {
        return RethinkDB.expr({}).merge({
          success: result('tables_dropped').ne(0),
        });
      });
    });
  }
}
