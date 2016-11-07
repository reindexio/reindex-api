import { get } from 'lodash';

import getDB from '../../db/getDB';
import formatMutationResult from '../mutations/formatMutationResult';
import performHook from './performHook';
import createReindex from '../createReindex';

export default function checkAndEnqueueHooks(
  db,
  allHooks,
  type,
  name,
  clientMutationId,
  data,
) {
  const globalHooks = get(allHooks, ['global', name]) || [];
  const typeHooks = get(allHooks, [type, name]) || [];
  const hooks = [...globalHooks, ...typeHooks];

  if (hooks.length > 0) {
    setImmediate(() => {
      const object = formatMutationResult(
        clientMutationId,
        type,
        data,
      );
      enqueueHooks(db.hostname, type, hooks, object);
    });
  }
}

async function enqueueHooks(hostname, type, hooks, object) {
  let db;
  try {
    db = await getDB(hostname);
    const credentials = {
      isAdmin: true,
      userID: null,
    };

    const { schema, context } = await createReindex().getOptions({
      db,
      credentials,
      extraRootFields: {
        hook: {
          name: 'hook',
          returnTypeName: type,
          returnTypeType: 'payload',
          resolve: () => object,
        },
      },
    });

    await Promise.all(
      hooks.map((hook) => performHook({ schema, context }, hook))
    );
  } catch (error) {
    console.error(error);
  } finally {
    await db.close();
  }
}
