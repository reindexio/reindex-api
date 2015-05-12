import {Record, List} from 'immutable';

/**
 * MutationQuery class.
 *
 * Query that performs mutation. Currently pretty dumb - just calls the
 * mutation with database and passed arguments.
 */
export default class MutationQuery extends Record({
  mutation: undefined,
  arguments: List(),
}) {
  toReQL(r, db) {
    return this.mutation(db, ...this.arguments);
  }
}
