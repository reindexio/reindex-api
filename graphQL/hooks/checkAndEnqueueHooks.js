import { get } from 'lodash';

import getDB from '../../db/getDB';
import getGraphQLContext from '../getGraphQLContext';
import performHook from './performHook';

export default function checkAndEnqueueHooks(
  db, allHooks, type, name, object
) {
  const globalHooks = get(allHooks, ['global', name]) || [];
  const typeHooks = get(allHooks, [type, name]) || [];
  const hooks = [...globalHooks, ...typeHooks];

  if (hooks.length > 0) {
    setImmediate(() => {
      enqueueHooks(db.hostname, type, hooks, object);
    });
  }
}

async function enqueueHooks(hostname, type, hooks, object) {
  const db = getDB(hostname);
  try {
    const credentials = {
      isAdmin: true,
      userID: null,
    };

    const context = getGraphQLContext(db, await db.getMetadata(), {
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
    await db.close();
  }
}
