import {Record, List} from 'immutable';
import Query from '../../query/Query';
import RelatedSelector from '../../query/selectors/RelatedSelector';
import childrenToQuery from '../childrenToQuery';
import mapAndPluck from '../mapAndPluck';

export default class TNode extends Record({
  name: undefined,
  alias: undefined,
  type: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newQuery = new Query({
      selector: new RelatedSelector({
        tableName: this.type,
        relatedField: this.name,
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
