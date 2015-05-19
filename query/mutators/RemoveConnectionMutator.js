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
      db.table('_types').get(this.tableName).update({
        fields: RethinkDB.row('fields').difference(
          RethinkDB.row('fields').filter({name: this.name})
        ),
      }, {
        returnChanges: true,
      }),
      db.table('_types').get(this.targetName).update({
        fields: RethinkDB.row('fields').difference(
          RethinkDB.row('fields').filter({name: this.reverseName})
        ),
      }, {
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
          changes: {
            'old_val': l('changes')('old_val').union(r('changes')('old_val')),
            'new_val': l('changes')('new_val').union(r('changes')('new_val')),
          },
        });
      }
      /* eslint-enable */
    ).merge({
      success: RethinkDB.row('replaced').ne(0),
      changes: RethinkDB.row('changes').merge((change) => {
        return {
          oldValue: change('old_val'),
          newValue: change('new_val'),
        };
      }),
    });
  }
}
