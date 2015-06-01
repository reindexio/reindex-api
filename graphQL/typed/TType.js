import {Record} from 'immutable';

export default class TType extends Record({
  name: undefined,
  type: undefined,
}) {
  toQuery() {
    // TODO: STUB
  }
}
