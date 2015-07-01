import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class RemoveConnectionMutator extends Record({
  tableName: undefined,
  targetName: undefined,
  name: undefined,
  reverseName: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(TYPE_TABLE).get(this.tableName).update((type) => ({
        fields: type('fields').difference(
          type('fields').filter({name: this.name})
        ),
        indexes: type('indexes').difference(
          type('indexes').filter({name: this.name})
        ),
      }), {
        returnChanges: true,
      }),
      db.table(TYPE_TABLE).get(this.targetName).update((type) => ({
        fields: type('fields').difference(
          type('fields').filter({name: this.reverseName})
        ),
      }), {
        returnChanges: true,
      }),
      db.table(this.tableName).indexDrop(this.name),
      db.table(this.tableName).replace((row) => {
        return row.without(this.name);
      }, {
        durability: 'soft',
      }),
      /* eslint-disable no-unused-vars */
      // ReQL wants both arguments to the function in RethinkDB.do.
      (l, r, ignoredIndex, ignoredDelete) => r('changes')(0)('new_val')
      /* eslint-enable */
    );
  }
}
