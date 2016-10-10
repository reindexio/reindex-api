import { graphql, formatError } from 'graphql';

import { isUserError } from './UserError';
import Monitoring from '../Monitoring';
import Metrics from '../server/Metrics';
import { trackEvent } from '../server/IntercomClient';
import createSchema from './createSchema';

export default class Reindex {
  constructor(contextFunction) {
    if (!(contextFunction instanceof Function)) {
      this._contextFunction = () => contextFunction;
    } else {
      this._contextFunction = contextFunction;
    }
  }

  async getOptions({ db, credentials, extraRootFields = null }) {
    const { typeRegistry, ...context } = await this._contextFunction({ db });
    const schema = createSchema(typeRegistry, extraRootFields);
    return {
      schema,
      context: {
        db,
        credentials,
        typeRegistry,
        ...context,
      },
    };
  }

  async processRequest(request) {
    const query = request.payload.query;
    const variables = request.payload.variables || {};
    const credentials = request.auth.credentials;
    const db = await request.getDB();

    const {
      schema,
      context,
    } = await this.getOptions({ db, credentials });

    const start = process.hrtime();
    const result = await graphql(
      schema,
      query,
      null,
      context,
      variables
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
      if (result.data && context.credentials.isAdmin) {
        trackEvent(context.credentials, 'executed-query', {
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

      if (context.db.stats) {
        Metrics.measure(
          `reindex.graphQL.dbTime`,
          `${context.db.stats.totalTime.toFixed(2)}ms`,
          request.info.hostname,
        );

        Metrics.measure(
          `reindex.graphQL.dbQueryCount`,
          context.db.stats.count,
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
      credentials: context.credentials,
      query,
      variables,
      stats: {
        elapsed,
        db: context.db.stats || {},
      },
      errors: result.errors || [],
    }));

    return result;
  }
}
