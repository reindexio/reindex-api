import {Record} from 'immutable';

import {SECRET_TABLE} from '../QueryConstants';

export default class AddSecretMutator extends Record({
  value: undefined,
}) {
  toReQL(db) {
    return db.table(SECRET_TABLE)
      .insert({ value: this.value }, { returnChanges: true })
      .merge((result) => result('changes')(0)('new_val'));
  }
}
