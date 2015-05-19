import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class RemoveFieldMutator extends Record({
  tableName: undefined,
  name: undefined,
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table('_types').get(this.tableName).update({
        fields: RethinkDB.row('fields').difference(
          RethinkDB.row('fields').filter({name: this.name})
        ),
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
      }),
      db.table(this.tableName).replace((row) => {
        return row.without(this.name);
      }, {
        durability: 'soft',
      }),
      /* eslint-disable no-unused-vars */
      // ReQL wants both arguments to the function in RethinkDB.do.
      (result, ignored) => {
        return result;
      }
      /* eslint-enable */
    );
  }
}
