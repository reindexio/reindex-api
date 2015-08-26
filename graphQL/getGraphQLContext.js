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
  const permissions = extractPermissions(permissionData);
  const schema = createSchema(fromJS(typeData));

  return {
    ...extraContext,
    conn,
    indexes,
    permissions,
    schema,
  };
}

function extractIndexes(indexes) {
  return groupBy(indexes, (index) => index.type);
}

function extractPermissions(permissions) {
  return chain(permissions)
          .groupBy((permission) => permission.type)
          .mapValues((typePermissions) => chain(typePermissions)
            .groupBy((permission) => permission.user || 'anonymous')
            .mapValues((userPermissions) => (
              userPermissions.reduce(combinePermissions)
            ), {})
            .value())
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
