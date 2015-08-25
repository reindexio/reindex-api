import { graphql } from 'graphql';

import getGraphQLContext from '../../graphQL/getGraphQLContext';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    const conn = await request.rethinkDBConnection;
    const credentials = request.auth.credentials;

    const context = await getGraphQLContext(conn, {
      credentials,
    });
    const result = await graphql(context.schema, query, context, variables);
    reply(JSON.stringify(result)).type('application/json');
  } catch (error) {
    // TODO(fson, 2015-04-13): Handle errors granularly.
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
