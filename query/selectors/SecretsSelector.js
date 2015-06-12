import {Record} from 'immutable';

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
    return db.table('_secrets').coerceTo('array');
  }
}
