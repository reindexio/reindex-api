import {Record, List} from 'immutable';
import Query from '../../query/Query';
import ReverseRelatedSelector
  from '../../query/selectors/ReverseRelatedSelector';
import childrenToQuery from '../childrenToQuery';

export default class TConnection extends Record({
  name: undefined,
  alias: undefined,
  type: undefined,
  reverseName: undefined,
  call: undefined,
  children: List(),
}) {
  toQuery(query, parents, newQuery) {
    if (!newQuery) {
      newQuery = new Query({
        selector: new ReverseRelatedSelector({
          tableName: this.type,
          relatedField: this.reverseName,
        }),
      });
    }

    if (this.call) {
      newQuery = this.call.toQuery(newQuery);
    }

    return childrenToQuery(
      query,
      List.of(this.alias || this.name),
      newQuery,
      this.children,
    );
  }
}
