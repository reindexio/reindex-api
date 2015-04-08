import Immutable from 'immutable';
import graphql from './graphql';
import {walkLeafs} from './utils';

export class SliceConverter extends Immutable.Record({
  from: undefined,
  to: undefined
}) {
  toRQL(r, db, query) {
    return query.slice(this.from, this.to);
  }
}

export class CoerceConverter extends Immutable.Record({
  to: ''
}) {
  toRQL(r, db, query) {
    return query.coerceTo(this.to);
  }
}

export class CountConverter extends Immutable.Record({
}) {
  toRQL(r, db, query) {
    return query.count();
  }
}

export class OrderByConverter extends Immutable.Record({
  orderBy: ''
}) {
  toRQL(r, db, query) {
    let orderBy;
    if (this.orderBy[0] === '-') {
      orderBy = r.desc(this.orderBy.slice(1));
    } else {
      orderBy = r.asc(this.orderBy);
    }
    return query.orderBy(orderBy);
  }
}

export class IDSelector extends Immutable.Record({
  ids: Immutable.List()
}) {
  toRQL(r, db, table, single, obj) {
    let table = db.table(table);
    if (single) {
      return table.get(this.ids[0]);
    } else {
      return table.getAll(...this.ids);
    }
  }
}

export class RelatedSelector extends Immutable.Record({
  relatedField: ""
}) {
  toRQL(r, db, table, single, obj = undefined) {
    let table = db.table(table);
    let selector = obj || r.row;
    if (single) {
      return table.get(selector(this.relatedField));
    } else {
      return table.getAll(selector(this.relatedField));
    }
  }
}

export class ReverseRelatedSelector extends Immutable.Record({
  relatedField: ""
}) {
  toRQL(r, db, table, single, obj) {
    let table = db.table(table);
    let query = table.getAll(obj('id'), {index: this.relatedField});
    if (single) {
      return query.nth(0);
    } else {
      return query;
    }
  }
}

export class FieldSelector extends Immutable.Record({
  path: Immutable.List()
}) {
  toRQL(r, db, table, single, obj = undefined) {
    return this.path.reduce((acc, next) => {
      return acc(next);
    }, obj || r.row);
  }
}

export class Query extends Immutable.Record({
  table: undefined,
  single: false,
  selector: undefined,
  pluck: Immutable.Map(),
  map: Immutable.OrderedMap(),
  converters: Immutable.List()
}) {
  toRQL(r, db, obj) {
    let query = this.selector.toRQL(r, db, this.table, this.single, obj);

    let rqlMap = mappingToRql(r, db, this.map);
    query = rqlMap.reduce((q, mapping) => {
      return q.merge(mapping);
    }, query);

    query = this.converters.reduce((q, converter) => {
      return converter.toRQL(r, db, q);
    }, query);

    if (!this.pluck.isEmpty()) {
      query = query.pluck(this.pluck.toJS());
    }

    return query;
  }
}

export function constructQuery(schema, graphQLRoot) {
  let {preQueries, query, rootName} = getRootCall(
    schema.rootCalls, graphQLRoot
  );
  return {
    preQueries: preQueries,
    query: processNode(schema, rootName, query, graphQLRoot.node)
  };
}

function processNode(schema, tableName, query, node, parents = []) {
  if (node.isLeaf()) {
    return query.setIn(
      ['pluck', ...parents],
      true
    );
  } else {
    if (node.calls) {
      query = applyCalls(schema, query, node);
    }

    return node.children
      .map((childNode) => {
        return processChild(schema, tableName, query, parents, childNode);
      })
      .reduce((query, newQuery) => {
        return mergeQueries(query, newQuery);
      });
  }
}

function mergeQueries(left, right) {
  return left.merge(right).merge({
    pluck: left.pluck.merge(right.pluck),
    map: left.map.merge(right.map),
    converters: left.converters.concat(right.converters)
  });
}

function mappingToRql(r, db, mapping) {
  function mapper(leaf, key, keys) {
    return function (obj) {
      return Immutable.Map()
        .setIn(keys, leaf.toRQL(r, db, obj))
        .toJS();
    };
  }
  function isLeaf(node) {
    return !node.toRQL;
  }
  return walkLeafs(mapping, mapper, isLeaf);
}

function getRootCall(rootCalls, root) {
  let node = root.node;
  return rootCalls.get(node.name)(node);
}

function applyCalls(schema, query, node) {
  return node.calls.reduce((query, call) => {
    return applyCall(schema, query, node, call);
  }, query);
}

function applyCall(schema, query, node, call) {
  let callFunction = schema.calls.get(call.name);
  return callFunction(query, node, call);
}

function getNodeSchema(schema, tableName, parents, nodeName) {
  let tableSchema = schema.tables.get(tableName);
  let parentSchema = parents.reduce((schemaPart, next) => {
    let nextSchema = schemaPart.get(next);
    if (nextSchema.isNestable()) {
      if (nextSchema.isConnection()) {
        return schema[nextSchema.target];
      } else {
        return nextSchema.childSchema;
      }
    } else {
      return nextSchema;
    }
  }, tableSchema);
  return parentSchema.get(nodeName);
}

function processChild(schema, tableName, query, parents, childNode) {
  let nodeSchema = getNodeSchema(
    schema,
    tableName,
    parents,
    childNode.name
  );
  if (nodeSchema.isConnection()) {
    if (nodeSchema.isEdgeable()) {
      return processToManyConnection(
        schema,
        nodeSchema,
        query,
        childNode,
        parents.concat(childNode.name)
      );
    } else {
      return processToOneConnection(
        schema,
        nodeSchema.target,
        query,
        childNode,
        parents.concat(childNode.name)
      );
    }
  } else if (nodeSchema.isEdgeable()) {
    // TODO(freiksenet, 2015-04-08): Stub
  } else {
    return processNode(
      schema,
      tableName,
      query,
      childNode,
      parents.concat(childNode.name)
    );
  }
}

function processArray() {
  // TODO(freiksenet, 2015-04-08): Stub
}

function processToManyConnection(schema, nodeSchema, query, node, parents) {
  let baseQuery = new Query({
    table: nodeSchema.target,
    selector: new ReverseRelatedSelector({
      relatedField: nodeSchema.reverseName
    }),
    converters: Immutable.List.of(new CoerceConverter({to: 'array'}))
  });
  if (node.calls) {
    baseQuery = applyCalls(schema, baseQuery, node);
  }

  let field = parents.concat(['_']);
  let query = query.setIn(
    ['map', ...field],
    baseQuery
  );

  let nestedQuery = baseQuery.merge({
    selector: new FieldSelector({
      path: field
    }),
    converters: Immutable.List()
  });

  return node.children
    .map((childNode) => {
      let name = childNode.name;
      if (name === 'count') {
        return [
          parents.concat(['count']),
          nestedQuery.updateIn(['converters'], (c) => {
            return c.push(new CountConverter({}));
          })
        ];
       } else if (name === 'edges') {
         return [
           parents.concat(['edges']),
           processNode(
             schema,
             nodeSchema.target,
             nestedQuery,
             childNode,
             []
           )
         ];
      }
    })
    .reduce((query, [selector, next]) => {
      return query.setIn(
        ['map', ...selector],
        next
      ).setIn(
        ['pluck', ...selector],
        true
      );
    }, query);
}

function processToOneConnection(schema, targetTable, query, node, parents) {
  let newQuery = processNode(
    schema,
    targetTable,
    new Query({
      single: true,
      table: targetTable,
      selector: new RelatedSelector({
        relatedField: node.name
      })
    }),
    node,
    []
  );
  return query.setIn(
    ['map', ...parents],
    newQuery
  ).setIn(
    ['pluck', ...parents],
    true
  );
}
