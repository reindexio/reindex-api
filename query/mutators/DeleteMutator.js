import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class DeleteMutator extends Record({
  tableName: undefined,
  id: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(this.tableName).get(this.id).delete({
        returnChanges: true,
      }),
      (result) => result('changes')(0)('old_val')
    );
  }
}
