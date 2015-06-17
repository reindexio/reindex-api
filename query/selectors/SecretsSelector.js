import {Record} from 'immutable';

import {SECRET_TABLE} from '../QueryConstants';

/**
 * Selects an array of all secrets
 *
 * @implements Selector
 *
 * @method toReQL(db)
 */
export default class SecretsSelector extends Record({
}) {
  toReQL(db) {
    return db.table(SECRET_TABLE).coerceTo('array');
  }
}
