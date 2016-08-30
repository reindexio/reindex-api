import { chain, mapValues, values, union } from 'lodash';

export default function createPermissions(typeSet, typeRegistry) {
  return {
    type: extractTypePermissions(typeSet),
    connection: extractConnectionPermissions(typeSet, typeRegistry),
    related: extractRelatedPermissions(typeSet),
  };
}

const DEFAULT_TYPE_PERMISSIONS = {
  EVERYONE: {
    grantee: 'EVERYONE',
    userPath: null,
    read: true,
    create: true,
    update: true,
    delete: true,
    permittedFields: null,
  },
};

export default function extractTypePermissions(typeSet) {
  const type = typeSet.type;
  if (typeSet.permissionMetadata) {
    return mapValues(
      DEFAULT_TYPE_PERMISSIONS,
      (permission) => addPermittedFields(permission, type.getFields())
    );
  } else {
    return chain(typeSet.rawPermissions)
      .filter((permission) => permission.grantee !== 'USER')
      .map((permission) => addPermittedFields(permission, type.getFields()))
      .groupBy((permission) => permission.grantee)
      .mapValues((permissions) => permissions.reduce(combinePermissions, {
        userPath: null,
        permittedFields: [],
      }))
      .value();
  }
}

export function extractConnectionPermissions(typeSet, typeRegistry) {
  const fields = typeSet.getFields();
  const permissions = (typeSet.permissionMetadata || [])
    .filter((permission) => permission.userPath);

  // Legacy grantPermissions
  const fieldPermissions = values(fields)
    .filter((field) => (
      field.metadata.grantPermissions &&
      (field.metadata.type === 'User' ||
      field.metadata.type === 'Connection' && field.metadata.ofType === 'User')
    ))
    .map((field) => ({
      ...field.grantPermissions,
      grantee: 'USER',
      userPath: [field.name],
    }));

  return chain(permissions.concat(fieldPermissions))
    .map((permission) => addPermittedFields(permission, fields))
    .groupBy((permission) => permission.userPath.join('.'))
    .map((pathPermissions) => pathPermissions.reduce(combinePermissions, {
      userPath: null,
      permittedFields: [],
    }))
    .flatten()
    .map((permission) => {
      let currentType = typeSet.name;
      permission.path = permission.userPath.map((segment) => {
        const field = typeRegistry
          .getTypeSet(currentType)
          .getFields[segment];
        currentType = typeRegistry.getTypeSetForObjectOrConnection(field.type);
        let connectionType;
        if (field.name === 'id') {
          connectionType = 'ITSELF';
        } else {
          connectionType = typeSet.connectionTypes[field.name];
        }

        return {
          name: segment,
          connectionType,
          type: currentType.name,
          reverseName: field.metadata.reverseName,
        };
      });

      return permission;
    })
    .value();
}

export function extractRelatedPermissions(typeSet) {
  return chain(typeSet.getFields())
    .filter((field) => field.metadata.reverseName)
    .map((field) => ({
      name: field.name,
      type: field.ofType || field.type,
      reverseName: field.reverseName,
      connectionType: typeSet.connectionTypes[field.name],
    }))
    .value();
}

function combinePermissions(left, right) {
  const result = {
    grantee: right.grantee,
    userPath: right.userPath || null,
    permittedFields: union(left.permittedFields, right.permittedFields),
  };

  for (const permission of ['read', 'create', 'update', 'delete']) {
    const leftPermission = left[permission];
    const rightPermission = right[permission];
    result[permission] = Boolean(rightPermission || leftPermission);
  }

  return result;
}

function addPermittedFields(permission, fields) {
  if (!permission.permittedFields) {
    return {
      ...permission,
      permittedFields: chain(fields)
        .filter((field) => !field.metadata.readOnly)
        .map((field) => field.name)
        .value(),
    };
  }
  return permission;
}
