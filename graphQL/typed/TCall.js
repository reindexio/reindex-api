import {Record, Map} from 'immutable';

export default class TCall extends Record({
  call: undefined,
  parameters: Map(),
}) {
  toQuery(query) {
    return this.call(query, this.parameters.toObject());
  }
}
