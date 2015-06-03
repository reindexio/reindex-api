import {Record, List} from 'immutable';
import Query from '../../query/Query';
import FieldSelector from '../../query/selectors/FieldSelector';
import childrenToQuery from '../childrenToQuery';
import mapAndPluck from '../mapAndPluck';

export default class TEdgesNode extends Record({
  name: undefined,
  alias: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newQuery = new Query({
      selector: new FieldSelector({
        path: parents,
      }),
    });

    newQuery = childrenToQuery(newQuery, List(), undefined, this.children);

    return mapAndPluck(
      query,
      [...parents, this.alias || this.name],
      newQuery
    );
  }
}
