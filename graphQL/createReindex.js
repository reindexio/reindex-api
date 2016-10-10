import { chain, groupBy, indexBy } from 'lodash';
import Reindex from './Reindex';
import createDefaultTypeRegistry from './createDefaultTypeRegistry';

export default function createReindex() {
  return new Reindex(async ({ db }) => {
    const { hooks, types, indexes } = await db.getMetadata();

    const indexesByType = groupBy(indexes, (index) => index.type);
    const hooksByType = extractHooks(hooks, types);

    const typeRegistry = createDefaultTypeRegistry({
      types,
      indexesByType,
      hooksByType,
    });

    return {
      typeRegistry,
      types,
      hooks: hooksByType,
      indexes: indexesByType,
    };
  });
}

export function extractHooks(hookData, types) {
  const typesByID = indexBy(types, (type) => type.id.value);

  return chain(hookData)
    .filter((hook) => !hook.type || typesByID[hook.type.value])
    .map((hook) => ({
      ...hook,
      type: hook.type && typesByID[hook.type.value],
    }))
    .flatten()
    .groupBy((hook) => hook.type ? hook.type.name : 'global')
    .mapValues((hooks) => groupBy(hooks, (hook) => hook.trigger))
    .value();
}
