var Immutable = require('immutable');
var base64 = require('base64-js');

class Query extends Immutable.Record({
  select: Immutable.List(),
  from: undefined,
  where: Immutable.Map(),
  limit: undefined,
  offset: undefined
}) {}

// Methods that can start the query, which are not classes
const ROOT_CALLS = {
};

// Collection methods, so stuff for root collection calls and relations
function getById(query, params) {
  return query.merge({
    from: "[" + params.map(base64.fromByteArray).join(", ") + "]"
  });
}

function first(query, params) {
  return query.merge({
    limit: params[0]
  });
}

const METHODS = {
  getById,
  first
};

// Methods that are applicable to leaf 'fields'
const LEAF_METHODS = {
};

function getRootCall(schema, name) {
  if (schema[name]) {
    let definition = schema[name];
    return [name, new Query()];
  } else if (ROOT_CALLS[name]) {
    return rootCalls[name](schema);
  } else {
    return undefined; // Error, invalid root call
  }
};

function applyCalls(query, calls) {
  return calls.reduce((q, next) => {
    let method;
    if (next.call) {
      method = METHODS[next.call];
    } else {
      method = getById;
    }
    return method(q, next.parameters);
  }, query);
}

function _processQuery(schema, name, parents, query, graphQuery) {
  if (graphQuery.type === 'field') {
    let fullChain = parents.concat([graphQuery.name]);
    return Immutable.List.of(query.merge({
      select: query.select.push(
        fullChain.join('.') + " as " + fullChain.join("__")
      )
    }));
  } else if (graphQuery.type === 'call') {
    query = applyCalls(query, graphQuery.calls);
  }

  let innerQueries = Immutable.List();
  if (graphQuery.properties) {
    for (let property of graphQuery.properties) {
      let propType = schema[name].properties[property.name];
      if (propType.type === 'LINKSET') {
      } else if (propType.type === 'LINK') {
        innerQueries = innerQueries.concat(_processQuery(
          schema,
          propType.linkedClass,
          parents.concat([property.name]),
          query,
          property
        ));
      } else {
        innerQueries = innerQueries.concat(_processQuery(
          schema,
          name,
          parents,
          query,
          property
        ));
      }
    }
  }
  query = innerQueries.reduce((q, n) => {
    return q.merge({
      from: n.from,
      limit: n.limit,
      offset: n.offset,
      select: q.select.concat(n.select),
      where: q.where.merge(n.where)
    });
  }, query);
  return Immutable.List.of(query);
}

export function processQuery(schema, graphQuery) {
  let [name, query] = getRootCall(schema, graphQuery.name);
  return _processQuery(schema, name, [], query, graphQuery);
}
