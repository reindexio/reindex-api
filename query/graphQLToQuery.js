import {fromJS, List} from 'immutable';
import * as rootCalls from './rootCalls';

/**
 * Converts GraphQL AST to Query using schema.
 *
 * @param schema - App schema
 * @param graphQLRoot - root of GraphQL AST
 */
export default function graphQLToQuery(schema, graphQLRoot) {
  let {preQueries, query, typeName, rootCall} = getRootCall(
    schema, graphQLRoot
  );
  let typedRoot = graphQLRoot.toTyped(schema, typeName, rootCall);
  query = typedRoot.toQuery(query, List());

  return {
    preQueries: preQueries,
    query: query,
  };
}

function getRootCall(schema, root) {
  let name = root.name;
  let rootCall = schema.calls.get(name);
  if (rootCall) {
    let fn = rootCalls[rootCall.name];
    let result = fn(...root.parameters.toArray());
    result.rootCall = rootCall;
    return result;
  } else {
    let validCalls = fromJS(rootCalls)
      .valueSeq()
      .map((rc) => {
        return rc.name;
      })
      .join(', ');
    throw new Error(
      `Root call "${name}" is invalid. ` +
      `Valid root calls are ${validCalls}.`
    );
  }
}
