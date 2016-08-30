import { chain, groupBy, indexBy } from 'lodash';
import Reindex from './Reindex';

import createCommonTypes from './builtins/createCommonTypes';
import createTypesFromReindexSchema from './createTypesFromReindexSchema';

export default function createReindex() {
  return new Reindex(async (request, typeRegistry) => {
    const query = request.payload.query;
    const variables = request.payload.variables || {};
    const db = await request.getDB();
    const { hooks, types, indexes } = await db.getMetadata();

    const typesById = indexBy(types, (type) => type.id.value);
    const indexesByType = groupBy(indexes, (index) => index.type);
    const hooksByType = extractHooks(hooks, typesById);

    typeRegistry.registerTypeSets(createCommonTypes(typeRegistry));
    typeRegistry.registerTypeSets(createTypesFromReindexSchema(
      typeRegistry, types, indexesByType, hooksByType
    ));

    return {
      query,
      variables,
      typeRegistry,
      db,
      credentials: request.auth.credentials,
    };
  });
}

export function extractHooks(hooks, typesByID) {
  const globalHooks = hooks.filter((hook) => !hook.type);

  return chain(hooks)
    .filter((hook) => hook.type && typesByID[hook.type.value])
    .map((hook) => ({
      ...hook,
      type: hook.type && typesByID[hook.type.value].name,
    }))
    .flatten()
    .groupBy((hook) => hook.type)
    .mapValues((typeHooks) => groupBy(
      typeHooks.concat(globalHooks),
      (hook) => hook.trigger)
    )
    .value();
}
