import RethinkDB from 'rethinkdb';
import {createLogger} from 'bunyan';

import AppStore from '../../apps/AppStore';
import GraphQLParser from '../../graphQL/Parser';
import graphQLToQuery from '../../query/graphQLToQuery';
import RethinkDBExecutor from '../../query/RethinkDBExecutor';

const log = createLogger({name: 'server'});

async function handler(request, reply) {
  let conn;
  try {
    conn = await RethinkDB.connect();
    const app = await AppStore.getByHostname(conn, request.info.hostname);
    const root = GraphQLParser.parse(request.payload.query);
    const query = graphQLToQuery(app.schema, root);
    const result = await RethinkDBExecutor.executeQuery(conn, app, query);
    reply(result);
  } catch (error) {
    // TODO(fson, 2015-04-13): Handle errors granularly.
    log.error(error);
    reply(error);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

const GraphQLHandler = {
  handler,
  method: 'POST',
  path: '/graphql',
};

export default GraphQLHandler;
