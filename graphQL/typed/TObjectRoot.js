import {Record, List} from 'immutable';
import childrenToQuery from '../childrenToQuery';

export default class TObjectRoot extends Record({
  children: List(),
}) {
  toQuery(query) {
    return childrenToQuery(
      query,
      List(),
      undefined,
      this.children
    );
  }
}
