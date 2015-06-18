import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class UpdateMutator extends Record({
  tableName: undefined,
  id: undefined,
  data: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(this.tableName).get(this.id).update(this.data.toJS(), {
        returnChanges: true,
      }),
      (result) => result('changes')(0)('new_val')
    );
  }
}
