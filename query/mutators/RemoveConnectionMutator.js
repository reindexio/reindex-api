import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class RemoveConnectionMutator extends Record({
  tableName: undefined,
  targetName: undefined,
  name: undefined,
  reverseName: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table('_types').get(this.tableName).update((type) => ({
        fields: type('fields').difference(
          type('fields').filter({name: this.name})
        ),
      }), {
        returnChanges: true,
      }),
      db.table('_types').get(this.targetName).update((type) => ({
        fields: type('fields').difference(
          type('fields').filter({name: this.reverseName})
        ),
      }), {
        returnChanges: true,
      }),
      db.table(this.tableName).replace((row) => {
        return row.without(this.name);
      }, {
        durability: 'soft',
      }),
      /* eslint-disable no-unused-vars */
      // ReQL wants both arguments to the function in RethinkDB.do.
      (l, r, ignored) => {
        return l.merge({
          changes: l('changes').union(r('changes')),
        });
      }
      /* eslint-enable */
    ).merge((result) => ({
      success: result('replaced').ne(0),
      changes: result('changes').merge((change) => ({
        oldValue: change('old_val'),
        newValue: change('new_val'),
      })),
    }));
  }
}
