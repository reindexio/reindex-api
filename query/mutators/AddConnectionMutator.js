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
      db.table('_types').get(this.tableName).update((type) => ({
        fields: type('fields').append({
          name: this.name,
          type: this.targetName,
          reverseName: this.reverseName,
          ...this.options.toJS(),
        }),
      }), {
        returnChanges: true,
      }),
      db.table('_types').get(this.targetName).update((type) => ({
        fields: type('fields').append({
          name: this.reverseName,
          type: 'connection',
          target: this.tableName,
          reverseName: this.name,
        }),
      }), {
        returnChanges: true,
      }),
      (l, r) => {
        return l.merge({
          changes: l('changes').union(r('changes')),
        });
      }
    ).merge((result) => ({
      success: result('replaced').ne(0),
      changes: result('changes').merge((change) => ({
        oldValue: change('old_val'),
        newValue: change('new_val'),
      })),
    }));
  }
}
