import Immutable from 'immutable';
import Query from './Query';
import RelatedSelector from './selectors/RelatedSelector';
import ReverseRelatedSelector from './selectors/ReverseRelatedSelector';
import FieldSelector from './selectors/FieldSelector';
import CoerceConverter from './converters/CoerceConverter';
import CountConverter from './converters/CountConverter';

/**
 * Converts GraphQL AST to Query using schema.
 *
 * @param schema - App schema
 * @param graphQLRoot - root of GraphQL AST
 */
export default function graphQLToQuery(schema, graphQLRoot) {
  let {preQueries, query, rootName} = getRootCall(
    schema.rootCalls, graphQLRoot
  );
  return {
    preQueries: preQueries,
    query: processNode(schema, rootName, query, graphQLRoot.node),
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
      .reduce((currentQuery, newQuery) => {
        return mergeQueries(currentQuery, newQuery);
      });
  }
}

function mergeQueries(left, right) {
  return left.merge(right).merge({
    pluck: left.pluck.merge(right.pluck),
    map: left.map.merge(right.map),
    converters: left.converters.concat(right.converters),
  });
}

function getRootCall(rootCalls, root) {
  let node = root.node;
  return rootCalls.get(node.name)(node);
}

function applyCalls(schema, query, node) {
  return node.calls.reduce((currentQuery, call) => {
    return applyCall(schema, currentQuery, node, call);
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
    return processArray();
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
  return true;
}

function processToManyConnection(schema, nodeSchema, query, node, parents) {
  let baseQuery = new Query({
    table: nodeSchema.target,
    selector: new ReverseRelatedSelector({
      relatedField: nodeSchema.reverseName,
    }),
    converters: Immutable.List.of(new CoerceConverter({to: 'array'})),
  });
  if (node.calls) {
    baseQuery = applyCalls(schema, baseQuery, node);
  }

  let field = parents.concat(['_']);
  query = query.setIn(
    ['map', ...field],
    baseQuery
  );

  let nestedQuery = baseQuery.merge({
    selector: new FieldSelector({
      path: field,
    }),
    converters: Immutable.List(),
  });

  return node.children
    .map((childNode) => {
      let name = childNode.name;
      if (name === 'count') {
        return [
          parents.concat(['count']),
          nestedQuery.updateIn(['converters'], (c) => {
            return c.push(new CountConverter({}));
          }),
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
           ),
         ];
       }
    })
    .reduce((q, [selector, next]) => {
      return q.setIn(
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
        relatedField: node.name,
      }),
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
