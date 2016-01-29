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

    const db = await request.getDB();
    const credentials = request.auth.credentials;

    const context = getGraphQLContext(db, await db.getMetadata(), {
      credentials,
    });
    const result = await graphql(context.schema, query, context, variables);

    if (result.data) {
      const rootNames = Object.keys(result.data).sort().join(',');
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
          Monitoring.noticeError(error.originalError, {
            request,
            extra: {
              graphQL: {
                query,
                variables,
              },
            },
            tags: {
              type: 'graphQL',
            },
          });
          return {
            message: 'Internal Server Error',
          };
        } else {
          return formatError(error);
        }
      });
    }

    Metrics.increment('graphql.requests', 1, request.info.hostname);

    console.log(JSON.stringify({
      hostname: request.info.hostname,
      credentials,
      query,
      variables,
      errors: result.errors || [],
    }));

    return reply(JSON.stringify(result)).type('application/json');
  } catch (error) {
    return reply(error);
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
