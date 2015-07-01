import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class AddIndexMutator extends Record({
  tableName: undefined,
  name: undefined,
  fields: undefined,
}) {
  toReQL(db) {
    let indexFields;
    if (this.fields.count() > 1) {
      indexFields = (obj) => {
        return this.fields.map((field) => obj(field)).toArray();
      };
    } else {
      indexFields = (obj) => obj(this.fields.first());
    }
    return RethinkDB.do(
      db.table(this.tableName).indexCreate(this.name, indexFields),
      () => {
        return RethinkDB.do(
          db.table(TYPE_TABLE).get(this.tableName).update((type) => ({
            indexes: type('indexes').append({
              name: this.name,
              fields: this.fields.map((field) => ({
                name: field,
              })).toJS(),
            }),
          }), {
            returnChanges: true,
          }),
          (result) => result('changes')(0)('new_val')
        );
      }
    );
  }
}
