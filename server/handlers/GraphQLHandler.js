import { graphql, formatError } from 'graphql';

import { isUserError } from '../../graphQL/UserError';
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

    const start = process.hrtime();
    const result = await graphql(
      context.schema,
      query,
      null,
      context,
      variables,
    );
    const elapsed = process.hrtime(start);

    let rootName = 'unknown';
    let hasErrors = false;

    if (result.data) {
      rootName = Object.keys(result.data).sort().join(',');
      if (rootName === 'viewer') {
        rootName = Object.keys(result.data.viewer).sort().join(',');
      }
    }

    if (result.errors) {
      result.errors = result.errors.map((error) => {
        if (error.originalError &&
            !isUserError(error.originalError)) {
          hasErrors = true;
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

    setImmediate(() => {
      if (result.data && credentials.isAdmin) {
        trackEvent(credentials, 'executed-query', {
          query,
          rootName,
          variables: JSON.stringify(variables),
        });
      }

      Metrics.increment(
        `reindex.graphQL.count`,
        1,
        request.info.hostname,
      );

      Metrics.measureHrTime(
        `reindex.graphQL.totalTime`,
        elapsed,
        request.info.hostname
      );

      if (db.stats) {
        Metrics.measure(
          `reindex.graphQL.dbTime`,
          `${db.stats.totalTime.toFixed(2)}ms`,
          request.info.hostname,
        );

        Metrics.measure(
          `reindex.graphQL.dbQueryCount`,
          db.stats.count,
          request.info.hostname,
        );
      }

      if (hasErrors) {
        Metrics.increment(
          `reindex.graphQL.errorCount`,
          1,
          request.info.hostname
        );
      }
    });

    console.log(JSON.stringify({
      hostname: request.info.hostname,
      credentials,
      query,
      variables,
      stats: {
        elapsed,
        db: db.stats || {},
      },
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
    validate: {
      payload: (value, options, next) => {
        if (!value || !value.query) {
          return next(new Error('Missing `query` in POST body.'));
        } else {
          return next(null, value);
        }
      },
    },
  },
  handler,
  method: 'POST',
  path: '/graphql',
};

export default GraphQLHandler;
