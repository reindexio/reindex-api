import {Record, Map} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class AddConnectionMutator extends Record({
  tableName: undefined,
  targetName: undefined,
  name: undefined,
  reverseName: undefined,
  options: Map(),
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table('_types').get(this.tableName).update({
        fields: RethinkDB.row('fields').append({
          name: this.name,
          type: this.targetName,
          reverseName: this.reverseName,
          ...this.options.toJS(),
        }),
      }, {
        returnChanges: true,
      }),
      db.table('_types').get(this.targetName).update({
        fields: RethinkDB.row('fields').append({
          name: this.reverseName,
          type: 'connection',
          target: this.tableName,
          reverseName: this.name,
        }),
      }, {
        returnChanges: true,
      }),
      (l, r) => {
        return l.merge({
          changes: {
            'old_val': l('changes')('old_val').union(r('changes')('old_val')),
            'new_val': l('changes')('new_val').union(r('changes')('new_val')),
          },
        });
      }
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
