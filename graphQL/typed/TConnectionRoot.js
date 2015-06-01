import {Record, List} from 'immutable';
import Query from '../../query/Query';
import ObjectSelector from '../../query/selectors/ObjectSelector';
import childrenToQuery from '../childrenToQuery';

export default class TConnectionRoot extends Record({
  children: List(),
}) {
  toQuery(query, parents) {
    let baseQuery = new Query({
      selector: new ObjectSelector({}),
    });

    return childrenToQuery(
      baseQuery,
      parents,
      query,
      this.children
    );
  }
}
