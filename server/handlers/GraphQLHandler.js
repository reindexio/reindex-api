import { graphql } from 'graphql';

import getGraphQLContext from '../../graphQL/getGraphQLContext';
import Monitoring from '../../Monitoring';
import { trackEvent } from '../../server/IntercomClient';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    Monitoring.setTransactionName('graphql');
    Monitoring.addCustomParameter('query', query);
    Monitoring.addCustomParameter('variables', variables);

    const db = request.db;
    const credentials = request.auth.credentials;

    const context = getGraphQLContext(db, await db.getMetadata(), {
      credentials,
    });
    const result = await graphql(context.schema, query, context, variables);

    if (result.data) {
      const rootNames = Object.keys(result.data).sort().join(',');
      Monitoring.setTransactionName(`graphql/${rootNames}`);
      if (credentials.isAdmin) {
        setImmediate(() => {
          trackEvent(credentials, 'executed-query', {
            query,
            rootNames,
            variables: JSON.stringify(variables),
          });
        });
      }
    }
    if (result.errors) {
      Monitoring.addCustomParameter('errors', result.errors);
    }

    reply(JSON.stringify(result)).type('application/json');
  } catch (error) {
    Monitoring.noticeError(error);
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
