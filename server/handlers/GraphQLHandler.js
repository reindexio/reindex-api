import graphql from '../../graphQL/graphql';
import Immutable from 'immutable';

import createSchema from '../../graphQL/createSchema';
import toJSON from '../toJSON';
import {getTypes} from '../../db/queries';

async function handler(request, reply) {
  try {
    const query = request.payload.query;
    const variables = request.payload.variables || {};

    const conn = await request.rethinkDBConnection;
    const types = await getTypes(conn);
    const schema = createSchema(Immutable.fromJS(types));
    const result = await graphql(schema, query, { conn }, variables);
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
