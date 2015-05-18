import {List, Record, Map, OrderedMap} from 'immutable';
import Query from '../query/Query';
import ObjectSelector from '../query/selectors/ObjectSelector';
import RelatedSelector from '../query/selectors/RelatedSelector';
import ReverseRelatedSelector from '../query/selectors/ReverseRelatedSelector';
import FieldSelector from '../query/selectors/FieldSelector';
import CoerceConverter from '../query/converters/CoerceConverter';
import CountConverter from '../query/converters/CountConverter';

export class TField extends Record({
  name: undefined,
  call: undefined,
}) {
  toQuery(query, parents) {
    if (this.call) {
      query = applyCall(query, this.call);
    }
    return query.setIn(
      ['pluck', ...parents, this.name],
      true
    );
  }
}

export class TConnectionRoot extends Record({
  child: undefined,
}) {
  toQuery(query, parents) {
    if (this.child.call) {
      query = applyCall(query, this.child.call);
    }
    query = query.set(
      'converters',
      query.converters.push(new CoerceConverter({to: 'array'}))
    );
    let newQuery = new Query({
      selector: new ObjectSelector({}),
      map: new OrderedMap({
        '_': query,
      }),
    });
    return unwrapEdgeable(
      newQuery,
      parents.push('objects'),
      List.of('_'),
      this.child.nodes,
      this.child.count
    );
  }
}

export class TObject extends Record({
  name: undefined,
  call: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    if (this.call) {
      query = applyCall(query, this.call);
    }

    if (this.name !== null) {
      parents = parents.push(this.name);
    }
    return this.children
      .map((childNode) => {
        return childNode.toQuery(query, parents);
      })
      .reduce(mergeQueries, query);
  }
}

export class TConnection extends Record({
  name: undefined,
  target: undefined,
  reverseName: undefined,
  call: undefined,
  children: List(),
}) {
  toQuery(query, parents) {
    let newNode = new TObject({
      name: null,
      children: this.children,
    });
    let baseQuery = new Query({
      selector: new RelatedSelector({
        tableName: this.target,
        relatedField: this.name,
      }),
    });

    if (this.call) {
      baseQuery = applyCall(baseQuery, this.call);
    }
    let newQuery = newNode.toQuery(
      baseQuery,
      List()
    );

    return mapAndPluck(query, [...parents, this.name], newQuery);
  }
}

export class TReverseConnection extends Record({
  name: undefined,
  target: undefined,
  reverseName: undefined,
  call: undefined,
  nodes: undefined,
  count: undefined,
}) {
  toQuery(query, parents) {
    let selector = new ReverseRelatedSelector({
      tableName: this.target,
      relatedField: this.reverseName,
    });

    let baseQuery = new Query({
      selector: selector,
      converters: List.of(new CoerceConverter({to: 'array'})),
    });
    if (this.call) {
      baseQuery = applyCall(baseQuery, this.call);
    }

    let tempField = parents.push(this.name).push('_');
    query = query.setIn(
      ['map', ...tempField],
      baseQuery
    );

    return unwrapEdgeable(
      query,
      parents.push(this.name),
      tempField,
      this.nodes,
      this.count
    );
  }
}

export class TArray extends Record({
  name: undefined,
  call: undefined,
  nodes: undefined,
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
    if (this.call) {
      baseQuery = applyCall(baseQuery, this.call);
    }

    let tempSelector = [...parents, '_'];
    query = query.setIn(
      ['map', ...tempSelector],
      baseQuery
    );

    return unwrapEdgeable(
      query,
      parents,
      tempSelector,
      this.nodes,
      this.count
    );
  }
}

export class TCall extends Record({
  fn: undefined,
  parameters: Map(),
}) {
  toQuery(query) {
    return this.fn(query, this.parameters.toObject());
  }
}

function mergeQueries(left, right) {
  return left.merge(right).merge({
    pluck: left.pluck.merge(right.pluck),
    map: left.map.merge(right.map),
    converters: left.converters.concat(right.converters),
  });
}

function applyCall(query, call) {
  return call.toQuery(query);
}

function unwrapEdgeable(query, parents, basePath, nodes, count) {
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

  if (nodes) {
    query = mapAndPluck(query, [...parents, 'nodes'], nodes.toQuery(
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
