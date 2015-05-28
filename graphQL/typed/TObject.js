import {Record, List} from 'immutable';
import Query from '../../query/Query';
import FieldSelector from '../../query/selectors/FieldSelector';
import childrenToQuery from '../childrenToQuery';

export default class TObject extends Record({
  name: undefined,
  alias: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newQuery;
    if (this.alias) {
      newQuery = new Query({
        selector: new FieldSelector({
          path: parents.push(this.name),
        }),
      });
    }

    return childrenToQuery(
      query,
      parents.push(this.alias || this.name),
      newQuery,
      this.children
    );
  }
}
