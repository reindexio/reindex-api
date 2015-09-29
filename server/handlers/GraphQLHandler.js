import { graphql } from 'graphql';
import Monitoring from '../../Monitoring';
import { getMetadata } from '../../db/queries/simpleQueries';

import getGraphQLContext from '../../graphQL/getGraphQLContext';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    Monitoring.setTransactionName('graphql');
    Monitoring.addCustomParameter('query', query);
    Monitoring.addCustomParameter('variables', variables);

    const conn = await request.rethinkDBConnection;
    const credentials = request.auth.credentials;

    const context = getGraphQLContext(conn, await getMetadata(conn), {
      credentials,
    });
    const result = await graphql(context.schema, query, context, variables);

    Monitoring.setTransactionName(`graphql/${Object.keys(result.data)[0]}`);

    if (result.errors) {
      Monitoring.addCustomParameter('errors', result.errors);
    }

    reply(JSON.stringify(result)).type('application/json');
  } catch (error) {
    reply(error);
  }
}

const GraphQLHandler = {
  config: {
    auth: 'token',
  },
  handler,
  method: 'POST',
  path: '/graphql',
};

export default GraphQLHandler;
