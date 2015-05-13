import {walkLeafs} from '../utils';
import Immutable from 'immutable';

/**
 * Query class.
 *
 * First base selector is called, then all mappings are merged, then converters
 * are applied is their order, finally needed fields are plucked.
 *
 * @param table - Base table to retrieve from.
 * @param single - whether to retrieve one record or many.
 * @param selector - base selector used to start query.
 * @param pluck - fields to pick from the direct query (all are picked if empty)
    Nested Immutable.Map.
 * @param map - additional queries (as anonymous functions) to merge to selected
     path. Nested Immutable.Map.
 * @param convertes - converters that are applied to query one-by-one.
 *
 * @method toReQL(r: rethinkdb, db: rethinkdb.db, obj: Any): rethinkdb.query
     convert to rethinkdb ready query.
 * @param obj - parent object (if this query is merged in via map).
 */
export default class Query extends Immutable.Record({
  table: undefined,
  single: false,
  selector: undefined,
  pluck: Immutable.Map(),
  map: Immutable.OrderedMap(),
  converters: Immutable.List(),
}) {
  toReQL(r, db, obj) {
    let query = this.selector.toReQL(r, db, {
      tableName: this.table,
      single: this.single,
      obj,
    });

    let rqlMap = mappingtoReQL(r, db, this.map);
    query = rqlMap.reduce((q, mapping) => {
      return q.merge(mapping);
    }, query);

    query = this.converters.reduce((q, converter) => {
      return converter.toReQL(r, db, q);
    }, query);

    if (!this.pluck.isEmpty()) {
      query = query.pluck(this.pluck.toJS());
    }

    return query;
  }
}

function mappingtoReQL(r, db, mapping) {
  function mapper(leaf, key, keys) {
    return function subQuery(obj) {
      return Immutable.Map()
        .setIn(keys, leaf.toReQL(r, db, obj))
        .toJS();
    };
  }
  function isLeaf(node) {
    return !node.toReQL;
  }
  return walkLeafs(mapping, mapper, isLeaf);
}
