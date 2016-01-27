import { graphql, formatError } from 'graphql';
import { GraphQLError } from 'graphql/error/GraphQLError';

import getGraphQLContext from '../../graphQL/getGraphQLContext';
import Metrics from '../Metrics';
import Monitoring from '../../Monitoring';
import { trackEvent } from '../IntercomClient';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    Monitoring.setTransactionName('graphql');
    Monitoring.addCustomParameter('query', query);
    Monitoring.addCustomParameter('variables', variables);

    const db = await request.getDB();
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
      result.errors = result.errors.map((error) => {
        if (error.originalError &&
           !(error.originalError instanceof GraphQLError)) {
          Monitoring.noticeError(error.originalError);
          return {
            message: 'Internal Server Error',
          };
        } else {
          return formatError(error);
        }
      });
      Monitoring.addCustomParameter('errors', result.errors);
    }

    Metrics.increment('graphql.requests', 1, request.info.hostname);

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
