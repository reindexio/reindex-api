import {Record, Map} from 'immutable';

export default class AddFieldMutator extends Record({
  tableName: undefined,
  name: undefined,
  type: undefined,
  options: Map(),
}) {
  toReQL(db) {
    return db.table('_types').get(this.tableName).update((type) => ({
      fields: type('fields').append({
        name: this.name,
        type: this.type,
        ...this.options.toJS(),
      }),
    }), {
      returnChanges: true,
    }).merge((result) => ({
      success: result('replaced').ne(0),
      changes: result('changes').merge((change) => {
        return {
          oldValue: change('old_val'),
          newValue: change('new_val'),
        };
      }),
    }));
  }
}
