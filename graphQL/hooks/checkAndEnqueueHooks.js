import { get } from 'lodash';
import RethinkDB from 'rethinkdb';

import Config from '../../server/Config';
import { getMetadata } from '../../db/queries/simpleQueries';
import getGraphQLContext from '../getGraphQLContext';
import performHook from './performHook';

export default function checkAndEnqueueHooks(
  conn, allHooks, type, name, object
) {
  const db = conn.db;
  const globalHooks = get(allHooks, ['global', name]) || [];
  const typeHooks = get(allHooks, [type, name]) || [];
  const hooks = [...globalHooks, ...typeHooks];

  if (hooks.length > 0) {
    setImmediate(() => {
      enqueueHooks(db, type, hooks, object);
    });
  }
}

async function enqueueHooks(db, type, hooks, object) {
  let conn;
  try {
    conn = await RethinkDB.connect({
      ...Config.get('RethinkDBPlugin'),
      db,
    });
    const credentials = {
      isAdmin: true,
      userID: null,
    };

    const context = getGraphQLContext(conn, await getMetadata(conn), {
      credentials,
    }, {
      hook: {
        name: 'hook',
        returnTypeName: type,
        returnTypeType: 'payload',
        resolve: () => object,
      },
    });

    await* hooks.map((hook) => performHook(context, hook));
  } catch (error) {
    console.error(error);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
