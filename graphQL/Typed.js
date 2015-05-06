import {List, Record, OrderedMap} from 'immutable';
import Query from '../query/Query';
import ObjectSelector from '../query/selectors/ObjectSelector';
import RelatedSelector from '../query/selectors/RelatedSelector';
import ReverseRelatedSelector from '../query/selectors/ReverseRelatedSelector';
import FieldSelector from '../query/selectors/FieldSelector';
import CoerceConverter from '../query/converters/CoerceConverter';
import CountConverter from '../query/converters/CountConverter';

export class TField extends Record({
  name: '',
}) {
  toQuery(query, parents) {
    return query.setIn(
      ['pluck', ...parents, this.name],
      true
    );
  }
}

export class TConnectionRoot extends Record({
  methods: List(),
  edges: undefined,
  count: undefined,
}) {
  toQuery(query, parents) {
    query = applyCalls(query, this.methods);
    query = query.set(
      'converters',
      query.converters.push(new CoerceConverter({to: 'array'}))
    );
    let newQuery = new Query({
      selector: new ObjectSelector({}),
      single: true,
      map: new OrderedMap({
        '_': query,
      }),
    });
    return unwrapEdgeable(
      newQuery,
      parents,
      List.of('_'),
      this.edges,
      this.count
    );
  }
}

export class TObject extends Record({
  name: '',
  methods: List(),
  children: List(),
}) {
  toQuery(query, parents) {
    query = applyCalls(query, this.methods);
    if (this.name !== null) {
      parents = parents.push(this.name);
    }
    return this.children
      .map((childNode) => {
        return childNode.toQuery(query, parents);
      })
      .reduce(mergeQueries);
  }
}

export class TConnection extends Record({
  name: '',
  target: '',
  reverseName: '',
  methods: List(),
  children: List(),
}) {
  toQuery(query, parents) {
    let newNode = new TObject({
      name: null,
      children: this.children,
    });
    let baseQuery = new Query({
      single: true,
      table: this.target,
      selector: new RelatedSelector({
        relatedField: this.name,
      }),
    });
    baseQuery = applyCalls(baseQuery, this.methods);
    let newQuery = newNode.toQuery(
      baseQuery,
      List()
    );

    return mapAndPluck(query, [...parents, this.name], newQuery);
  }
}

export class TReverseConnection extends Record({
  name: '',
  target: '',
  reverseName: '',
  methods: List(),
  edges: undefined,
  count: undefined,
}) {
  toQuery(query, parents) {
    let selector = new ReverseRelatedSelector({
      relatedField: this.reverseName,
    });

    let baseQuery = new Query({
      table: this.target,
      selector: selector,
      converters: List.of(new CoerceConverter({to: 'array'})),
    });
    baseQuery = applyCalls(baseQuery, this.methods);

    let tempField = parents.push(this.name).push('_');

    query = query.setIn(
      ['map', ...tempField],
      baseQuery
    );

    return unwrapEdgeable(
      query,
      parents.push(this.name),
      tempField,
      this.edges,
      this.count
    );
  }
}

export class TArray extends Record({
  name: '',
  methods: List(),
  edges: undefined,
  count: undefined,
}) {
  toQuery(query, parents) {
    if (this.name !== null) {
      parents = parents.push(this.name);
    }

    let baseQuery = new Query({
      selector: new FieldSelector({
        path: parents,
      }),
      table: query.table,
    });
    baseQuery = applyCalls(baseQuery, this.methods);

    let tempSelector = [...parents, '_'];
    query = query.setIn(
      ['map', tempSelector],
      baseQuery
    );

    return unwrapEdgeable(
      query,
      parents,
      tempSelector,
      this.edges,
      this.count
    );
  }
}

export class TMethod extends Record({
  name: '',
  method: undefined,
  parameters: List(),
}) {
  toQuery(query) {
    return this.method(query, ...this.parameters);
  }
}

function mergeQueries(left, right) {
  return left.merge(right).merge({
    pluck: left.pluck.merge(right.pluck),
    map: left.map.merge(right.map),
    converters: left.converters.concat(right.converters),
  });
}

function applyCalls(query, methods) {
  return methods.reduce((q, method) => method.toQuery(q), query);
}

function unwrapEdgeable(query, parents, basePath, edges, count) {
  let nestedQuery = new Query({
    selector: new FieldSelector({
      path: basePath,
    }),
    table: query.table,
  });

  if (count) {
    query = mapAndPluck(
      query, [...parents, 'count'],
      nestedQuery.updateIn(['converters'], (c) => {
        return c.push(new CountConverter({}));
      })
    );
  }

  if (edges) {
    query = mapAndPluck(query, [...parents, 'edges'], edges.toQuery(
      nestedQuery,
      List()
    ));
  }

  return query;
}

function mapAndPluck(query, selector, mapper) {
  return query
    .setIn(['map', ...selector], mapper)
    .setIn(['pluck', ...selector], true);
}
