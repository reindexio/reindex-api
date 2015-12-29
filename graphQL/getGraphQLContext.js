import { chain, groupBy } from 'lodash';
import createSchema from './createSchema';

export default function getGraphQLContext(
  db, metadata, extraContext, extraRootFields,
) {
  const {
    types: typeData,
    indexes: indexData,
    permissions: permissionData,
    hooks: hookData,
  } = metadata;
  const indexes = extractIndexes(indexData);
  const typePermissions = extractPermissions(permissionData, typeData);
  const connectionPermissions = extractConnectionPermissions(typeData);
  const hooks = extractHooks(hookData, typeData);
  const schema = createSchema(typeData, extraRootFields);
  return {
    ...extraContext,
    db,
    indexes,
    permissions: {
      type: typePermissions,
      connection: connectionPermissions,
    },
    hooks,
    types: typeData,
    schema,
  };
}

function extractIndexes(indexes) {
  return groupBy(indexes, (index) => index.type);
}

function extractPermissions(permissions, types) {
  const typesByID = chain(types)
    .groupBy((type) => type.id.value)
    .mapValues((value) => value[0].name)
    .value();

  const definedTypePermissions = chain(permissions)
    .filter((permission) => permission.type)
    .groupBy((permission) => typesByID[permission.type.value])
    .value();

  const allTypesPermissions = permissions
    .filter((permission) => !permission.type);

  return chain(typesByID)
    .map((name) => [
      name,
      chain(allTypesPermissions)
        .concat(definedTypePermissions[name] || [])
        .groupBy((permission) => (
          permission.user ? permission.user.value : 'anonymous'
        ))
        .mapValues((userPermissions) => (
          userPermissions.reduce(combinePermissions, {})
        ))
        .value(),
    ])
    .zipObject()
    .value();
}

function extractConnectionPermissions(types) {
  return chain(types)
    .indexBy((type) => type.name)
    .mapValues((type) => (type.permissions || []).concat(
      type.fields
        .filter((field) => (
          field.grantPermissions &&
          (field.type === 'User' ||
          field.type === 'Connection' && field.ofType === 'User')
        ))
        .map((field) => ({
          ...field.grantPermissions,
          path: [field.name],
        }))
    ))
    .value();
}

function combinePermissions(left, right) {
  const result = {};
  for (const permission of ['read', 'create', 'update', 'delete']) {
    const leftPermission = left[permission];
    const rightPermission = right[permission];
    if (leftPermission === false || rightPermission === false) {
      result[permission] = false;
    } else {
      result[permission] = rightPermission || leftPermission;
    }
  }
  return result;
}

function extractHooks(hookData, typeData) {
  const typesByID = chain(typeData)
    .groupBy((type) => type.id.value)
    .mapValues((value) => value[0])
    .value();

  return chain(hookData)
    .map((hook) => ({
      ...hook,
      type: hook.type && typesByID[hook.type.value],
    }))
    .flatten()
    .groupBy((hook) => hook.type ? hook.type.name : 'global')
    .mapValues((hooks) => groupBy(hooks, (hook) => hook.trigger))
    .value();
}
