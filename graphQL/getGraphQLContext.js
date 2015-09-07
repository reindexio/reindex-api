import { chain, groupBy } from 'lodash';
import { fromJS } from 'immutable';
import { getMetadata } from '../db/queries/simpleQueries';
import createSchema from './createSchema';

export default async function getGraphQLContext(conn, extraContext) {
  const {
    types: typeData,
    indexes: indexData,
    permissions: permissionData,
  } = await getMetadata(conn);
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

  const allTypesPermissions = permissions
    .filter((permission) => !permission.type);

  return chain(permissions)
    .filter((permission) => permission.type)
    .groupBy((permission) => typesByID[permission.type.value])
    .mapValues((typePermissions) => chain(typePermissions)
      .concat(allTypesPermissions)
      .groupBy((permission) => (
        permission.user ? permission.user.value : 'anonymous'
      ))
      .mapValues((userPermissions) => (
        userPermissions.reduce(combinePermissions, {})
      ))
      .value())
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
  const result = { ...right };
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
