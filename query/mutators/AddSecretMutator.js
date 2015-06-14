import {Record} from 'immutable';

export default class AddSecretMutator extends Record({
  secret: undefined,
}) {
  toReQL(db) {
    return db.table('_secrets').insert({ value: this.secret }, {
      returnChanges: true,
    }).merge((result) => ({
      success: result('inserted').eq(1),
      changes: result('changes').merge((change) => ({
        oldValue: change('old_val'),
        newValue: change('new_val'),
      })),
    }));
  }
}
