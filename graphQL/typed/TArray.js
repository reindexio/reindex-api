import {Record, List} from 'immutable';
import Query from '../../query/Query';
import FieldSelector from '../../query/selectors/FieldSelector';
import childrenToQuery from '../childrenToQuery';

export default class TArray extends Record({
  name: undefined,
  alias: undefined,
  call: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newQuery = new Query({
      selector: new FieldSelector({
        path: parents.push(this.name),
      }),
    });

    if (this.call) {
      newQuery = this.call.toQuery(newQuery);
    }

    return childrenToQuery(
      query,
      parents.push(this.alias || this.name),
      newQuery,
      this.children
    );
  }
}
