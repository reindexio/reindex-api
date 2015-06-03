import {Record, List} from 'immutable';
import CoerceConverter from '../../query/converters/CoerceConverter';
import childrenToQuery from '../childrenToQuery';
import mapAndPluck from '../mapAndPluck';

export default class TEdges extends Record({
  name: undefined,
  children: List(),
}) {
  toQuery(query, parents, newQuery) {
    newQuery = newQuery.updateIn(['converters'], (converters) => {
      return converters.push(new CoerceConverter({to: 'array'}));
    });
    newQuery = childrenToQuery(
      newQuery,
      List.of(this.name),
      undefined,
      this.children
    );

    return mapAndPluck(
      query,
      [...parents, this.name],
      newQuery
    );
  }
}
