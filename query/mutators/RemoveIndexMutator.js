import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class RemoveIndexMutator extends Record({
  tableName: undefined,
  name: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(TYPE_TABLE).get(this.tableName).update((type) => ({
        indexes: type('indexes').difference(
          type('indexes').filter({name: this.name})
        ),
      }), {
        returnChanges: true,
      }), (result) => RethinkDB.do(
        db.table(this.tableName).indexDrop(this.name),
        () => result('changes')(0)('new_val')
      )
    );
  }
}
