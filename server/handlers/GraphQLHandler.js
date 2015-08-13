import graphql from '../../graphQL/graphql';
import Immutable from 'immutable';

import createSchema from '../../graphQL/createSchema';
import toJSON from '../toJSON';
import {getTypes} from '../../db/queries/simple';
import extractIndexes from '../../db/extractIndexes';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    const conn = await request.rethinkDBConnection;
    const types = Immutable.fromJS(await getTypes(conn));
    const indexes = extractIndexes(types);
    const schema = createSchema(types);
    const result = await graphql(schema, query, {
      conn,
      indexes,
    }, variables);
    reply(toJSON(result)).type('application/json');
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
