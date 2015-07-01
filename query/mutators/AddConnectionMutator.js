import {Record, Map} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class AddConnectionMutator extends Record({
  tableName: undefined,
  targetName: undefined,
  name: undefined,
  reverseName: undefined,
  options: Map(),
}) {
  toReQL(db) {
    return RethinkDB.do(
      db.table(TYPE_TABLE).get(this.tableName).update((type) => ({
        fields: type('fields').append({
          name: this.name,
          type: this.targetName,
          reverseName: this.reverseName,
          ...this.options.toJS(),
        }),
        indexes: type('indexes').append({
          name: this.name,
          fields: [{name: this.name}],
        }),
      }), {
        returnChanges: true,
      }),
      db.table(TYPE_TABLE).get(this.targetName).update((type) => ({
        fields: type('fields').append({
          name: this.reverseName,
          type: 'connection',
          target: this.tableName,
          reverseName: this.name,
        }),
      }), {
        returnChanges: true,
      }),
      db.table(this.tableName).indexCreate(this.name),
      /* eslint-disable no-unused-vars */
      // ReQL wants both arguments to the function in RethinkDB.do.
      (l, r, ignored) => r('changes')(0)('new_val')
      /* eslint-enable */
    );
  }
}
