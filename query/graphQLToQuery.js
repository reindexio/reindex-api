import {List} from 'immutable';

/**
 * Converts GraphQL AST to Query using schema.
 *
 * @param schema - App schema
 * @param graphQLRoot - root of GraphQL AST
 */
export default function graphQLToQuery(schema, graphQLRoot) {
  let {rootCall, parameters} = graphQLRoot.getRootCall(schema);
  let {query, typeName} = rootCall.fn(parameters.toObject());

  let typedRoot = graphQLRoot.toTyped(schema, typeName, rootCall);
  query = typedRoot.toQuery(query, List());

  return query;
}
