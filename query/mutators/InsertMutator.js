import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class InsertMutator extends Record({
  tableName: undefined,
  data: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(this.tableName).insert(this.data.toJS(), {
        returnChanges: true,
      }),
      (result) => result('changes')(0)('new_val')
    );
  }
}
