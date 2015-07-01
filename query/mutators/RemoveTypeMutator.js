import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class RemoveTypeMutator extends Record({
  name: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(db.table(TYPE_TABLE).get(this.name).delete({
      returnChanges: true,
    }), (result) => {
      return RethinkDB.do(db.tableDrop(this.name), () => {
        return result('changes')(0)('old_val');
      });
    });
  }
}
