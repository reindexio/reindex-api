import AppStore from '../../apps/AppStore';
import RethinkDB from 'rethinkdb';
import runGraphQL from '../../graphQL/runGraphQL';
import DBContext from '../../db/DBContext';

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
    const result = await runGraphQL(app.schema, dbContext, query, variables);
    reply(result);
  } catch (error) {
    // TODO(fson, 2015-04-13): Handle errors granularly.
    reply(error);
  }
}

const GraphQLHandler = {
  handler,
  method: 'POST',
  path: '/graphql',
};

export default GraphQLHandler;
