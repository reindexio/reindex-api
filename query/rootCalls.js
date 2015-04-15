import {List} from 'immutable';
import Query from './Query';
import IDSelector from './selectors/IDSelector';
import AllSelector from './selectors/AllSelector';

export function nodes(type) {
  return {
    preQueries: List(),
    query: new Query({
      selector: new AllSelector(),
      table: type,
    }),
    typeName: type,
  };
}

export function node(type, id) {
  return {
    preQueries: List(),
    query: new Query({
      selector: new IDSelector({ids: List.of(id)}),
      table: type,
      single: true,
    }),
    typeName: type,
  };
}
