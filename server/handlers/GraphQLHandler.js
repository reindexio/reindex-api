import AppStore from '../../apps/AppStore';
import GraphQLParser from '../../graphQL/Parser';
import graphQLToQuery from '../../query/graphQLToQuery';
import RethinkDBExecutor from '../../query/RethinkDBExecutor';

async function handler(request, reply) {
  const conn = request.rethinkDBConnection;
  try {
    const app = await AppStore.getByHostname(conn, request.info.hostname);
    const root = GraphQLParser.parse(request.payload.query);
    const query = graphQLToQuery(app.schema, root);
    const result = await RethinkDBExecutor.executeQuery(conn, app, query);
    reply(result);
  } catch (error) {
    // TODO(fson, 2015-04-13): Handle errors granularly.
    reply(error);
  }
}

const GraphQLHandler = {
  handler,
  method: 'POST',
  path: '/graphql',
};

export default GraphQLHandler;
