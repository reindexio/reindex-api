import {Record, List} from 'immutable';
import Query from '../../query/Query';
import ObjectSelector from '../../query/selectors/ObjectSelector';
import childrenToQuery from '../childrenToQuery';
import mapAndPluck from '../mapAndPluck';

export default class TType extends Record({
  name: undefined,
  type: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newQuery = new Query({
      selector: new ObjectSelector({
        object: this.type,
      }),
    });

    newQuery = childrenToQuery(newQuery, List(), undefined, this.children);

    return mapAndPluck(
      query,
      [...parents, this.name],
      newQuery,
    );
  }
}
