import RethinkDB from 'rethinkdb';
import AppStore from '../../apps/AppStore';
import DBContext from '../../db/DBContext';
import graphql from '../../graphQL/graphql';
import toJSON from '../toJSON';

async function handler(request, reply) {
  const conn = request.rethinkDBConnection;
  try {
    const app = await AppStore.getByHostname(conn, request.info.hostname);
    const dbContext = new DBContext({
      db: RethinkDB.db(app.dbName),
      conn,
    });
    const query = request.payload.query;
    const variables = request.payload.variables || {};
    const result = await graphql(app.schema, query, {dbContext}, variables);
    reply(toJSON(result))
      .type('application/json');
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
