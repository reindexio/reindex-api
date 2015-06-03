import {Record} from 'immutable';

export default class TCursor extends Record({
  name: undefined,
}) {
  toQuery(query) {
    // TODO: STUB
    return query;
  }
}
