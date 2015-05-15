import {walkLeafs} from '../utils';
import {Record, Map, OrderedMap, List} from 'immutable';

/**
 * Query class.
 *
 * First base selector is called, then all mappings are merged, then converters
 * are applied is their order, finally needed fields are plucked.
 *
 * @param selector - base selector used to start query.
 * @param pluck - fields to pick from the direct query (all are picked if empty)
    Nested Immutable.Map.
 * @param map - additional queries (as anonymous functions) to merge to selected
     path. Nested Immutable.Map.
 * @param convertes - converters that are applied to query one-by-one.
 *
 * @method toReQL(db: rethinkdb.db, obj: Any): rethinkdb.query
     convert to rethinkdb ready query.
 * @param obj - parent object (if this query is merged in via map).
 */
export default class Query extends Record({
  selector: undefined,
  pluck: Map(),
  map: OrderedMap(),
  converters: List(),
}) {
  toReQL(db, obj) {
    let query = this.selector.toReQL(db, {
      obj,
    });

    let rqlMap = mappingtoReQL(db, this.map);
    query = rqlMap.reduce((q, mapping) => {
      return q.merge(mapping);
    }, query);

    query = this.converters.reduce((q, converter) => {
      return converter.toReQL(db, q);
    }, query);

    if (!this.pluck.isEmpty()) {
      query = query.pluck(this.pluck.toJS());
    }

    return query;
  }
}

function mappingtoReQL(db, mapping) {
  function mapper(leaf, key, keys) {
    return function subQuery(obj) {
      return Map()
        .setIn(keys, leaf.toReQL(db, obj))
        .toJS();
    };
  }
  function isLeaf(node) {
    return !node.toReQL;
  }
  return walkLeafs(mapping, mapper, isLeaf);
}
