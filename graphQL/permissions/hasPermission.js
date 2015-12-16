import { isArray } from 'lodash';

// Check if user has a certain permission for type
//
// First check if user has a global type permission and if not, whether
// there is a connection that grants him permission
export default function hasPermission(type, permission, object, {
  rootValue: {
    credentials,
    permissions: {
      type: permissionsByType,
      connection: permissionsByConnection,
    },
  },
}) {
  const { isAdmin, userID: id } = credentials;
  const userID = id && id.value;

  if (isAdmin) {
    return true;
  }

  const typePermission = hasTypePermissions(
    permissionsByType,
    permission,
    type,
    userID
  );

  if (typePermission) {
    return true;
  } else {
    return hasConnectionPermissions(
      permissionsByConnection,
      permission,
      object,
      type,
      userID,
    );
  }
}

function hasTypePermissions(permissions, permission, type, userID) {
  const permissionsByUser = permissions[type] || {};
  let userPermission;

  if (userID) {
    const userPermissions = permissionsByUser[userID] || {};
    userPermission = userPermissions[permission];
  }

  if (userPermission === undefined) {
    const anonymousPermissions = permissionsByUser.anonymous || {};
    userPermission = anonymousPermissions[permission];
  }

  return userPermission || false;
}

function hasConnectionPermissions(
  permissions,
  permission,
  object,
  type,
  userID
) {
  if (!userID) {
    return false;
  }

  const isCurrentUser = (
    type === 'User' &&
    object.id &&
    object.id.value === userID
  );
  if (isCurrentUser && (permission === 'read' || permission === 'delete')) {
    return true;
  }

  const userFields = permissions[type] || [];

  for (const field of userFields) {
    const name = field.name;
    const value = object[name];
    let isConnectedToUser = false;
    if (isArray(value)) {
      isConnectedToUser = value.some((id) => id.value === userID);
    } else if (value && value.value) {
      isConnectedToUser = value.value === userID;
    }

    if (isConnectedToUser) {
      const grants = field.grantPermissions[permission];
      if (grants) {
        return true;
      }
    }
  }

  return false;
}
