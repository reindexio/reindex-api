import {List} from 'immutable';
import rootCalls from './rootCalls';

/**
 * Converts GraphQL AST to Query using schema.
 *
 * @param schema - App schema
 * @param graphQLRoot - root of GraphQL AST
 */
export default function graphQLToQuery(schema, graphQLRoot) {
  let {query, typeName, rootCall} = getRootCall(
    schema, graphQLRoot
  );
  let typedRoot = graphQLRoot.toTyped(schema, typeName, rootCall);
  query = typedRoot.toQuery(query, List());

  return query;
}

function getRootCall(schema, root) {
  let name = root.name;
  let rootCall = schema.calls.get(name);
  if (rootCall) {
    let fn = rootCalls.get(rootCall.name).fn;
    let result = fn(...root.parameters.toArray());
    result.rootCall = rootCall;
    return result;
  } else {
    let validCalls = rootCalls
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
