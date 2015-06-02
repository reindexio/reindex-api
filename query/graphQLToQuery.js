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
  let {rootCall, parameters} = graphQLRoot.getRootCall(schema);
  let {query, typeName} = rootCall.call(schema, parameters.toObject());

  let typedRoot = graphQLRoot.toTyped(schema, typeName, rootCall);
  query = typedRoot.toQuery(query, List());

  let wrappedQuery = new Query({
    selector: new ObjectSelector({}),
    map: Map({
      [graphQLRoot.alias || graphQLRoot.name]: query,
    }),
  });

  return wrappedQuery;
}
