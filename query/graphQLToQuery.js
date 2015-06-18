import {List, Map} from 'immutable';
import Query from './Query';
import ObjectSelector from './selectors/ObjectSelector';

/**
 * Converts GraphQL AST to Query using schema.
 *
 * @param schema - App schema
 * @param graphQLRoot - root of GraphQL AST
 */
export default function graphQLToQuery(schema, graphQLRoot) {
  const {rootCall, parameters} = graphQLRoot.getRootCall(schema);
  const {query, typeName} = rootCall.call(schema, parameters.toObject());

  const typedRoot = graphQLRoot.toTyped(schema, typeName, rootCall);
  const resultQuery = typedRoot.toQuery(query, List());

  const wrappedQuery = new Query({
    selector: new ObjectSelector({}),
    map: Map({
      [graphQLRoot.alias || graphQLRoot.name]: resultQuery,
    }),
  });

  return wrappedQuery;
}
