import { chain, groupBy } from 'lodash';
import { fromJS } from 'immutable';
import createSchema from './createSchema';

export default function getGraphQLContext(conn, metadata, extraContext) {
  const {
    types: typeData,
    indexes: indexData,
    permissions: permissionData,
  } = metadata;
  const indexes = extractIndexes(indexData);
  const typePermissions = extractPermissions(permissionData, typeData);
  const connectionPermissions = extractConnectionPermissions(typeData);
  const schema = createSchema(fromJS(typeData));
  return {
    ...extraContext,
    conn,
    indexes,
    permissions: {
      type: typePermissions,
      connection: connectionPermissions,
    },
    types: typeData,
    schema,
  };
}

function extractIndexes(indexes) {
  return groupBy(indexes, (index) => index.type);
}

function extractPermissions(permissions, types) {
  const typesByID = chain(types)
    .groupBy((type) => type.id)
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
    .groupBy((type) => type.name)
    .mapValues((type) => (
      type[0].fields.filter((field) => (
        field.type === 'User' &&
        field.grantPermissions
      ))
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
