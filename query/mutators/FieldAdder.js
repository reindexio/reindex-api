import {Record, Map} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class FieldAdder extends Record({
  tableName: undefined,
  name: undefined,
  type: undefined,
  options: Map(),
}) {
  toReQL(db) {
    return db.table('_types').get(this.tableName).update({
      fields: RethinkDB.row('fields').append({
        name: this.name,
        type: this.type,
        ...this.options.toJS(),
      }),
    }, {
      returnChanges: true,
    }).merge({
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
