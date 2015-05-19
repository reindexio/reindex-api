import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class RemoveTypeMutator extends Record({
  name: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(db.table('_types').get(this.name).delete(), () => {
      return RethinkDB.do(db.tableDrop(this.name), (result) => {
        return RethinkDB.expr({}).merge({
          success: result('tables_dropped').ne(0),
        });
      });
    });
  }
}
