import { graphql } from 'graphql';
import { fromJS } from 'immutable';

import createSchema from '../../graphQL/createSchema';
import { getTypes, getIndexes } from '../../db/queries/simpleQueries';
import extractIndexes from '../../db/extractIndexes';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    const conn = await request.rethinkDBConnection;
    const typePromise = getTypes(conn);
    const indexPromise = getIndexes(conn);
    const indexes = extractIndexes(fromJS(await indexPromise));
    const schema = createSchema(fromJS(await typePromise));
    const result = await graphql(schema, query, {
      conn,
      indexes,
    }, variables);
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
