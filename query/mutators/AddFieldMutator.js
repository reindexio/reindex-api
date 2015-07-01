import {Record, Map} from 'immutable';

import {TYPE_TABLE} from '../QueryConstants';

export default class AddFieldMutator extends Record({
  tableName: undefined,
  name: undefined,
  type: undefined,
  options: Map(),
}) {
  toReQL(db) {
    return db.table(TYPE_TABLE).get(this.tableName).update((type) => ({
      fields: type('fields').append({
        name: this.name,
        type: this.type,
        ...this.options.toJS(),
      }),
    }), {
      returnChanges: true,
    }).do((result) => result('changes')(0)('new_val'));
  }
}
