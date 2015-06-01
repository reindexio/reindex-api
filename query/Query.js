import {walkLeafs} from '../utils';
import {Record, Map, List} from 'immutable';

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
  map: Map(),
  converters: List(),
}) {
  toReQL(db, obj) {
    let query = this.selector.toReQL(db, {
      obj,
    });

    if (this.map.count() > 0) {
      query = query.merge(createReQLMerge(db, this.map));
    }

    query = this.converters.reduce((q, converter) => {
      return converter.toReQL(db, q);
    }, query);

    if (!this.pluck.isEmpty()) {
      query = query.pluck(this.pluck.toJS());
    }

    return query;
  }
}

function createReQLMerge(db, mapping) {
  function mapper(obj, leaf, key, keys) {
    return Map()
      .setIn(keys, leaf.toReQL(db, obj));
  }
  function isLeaf(node) {
    return !node.toReQL;
  }
  return function subQuery(obj) {
    return walkLeafs(mapping, (...args) => mapper(obj, ...args), isLeaf)
      .reduce((acc, next) => acc.mergeDeep(next), Map())
      .toJS();
  };
}
