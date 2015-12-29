import { isArray } from 'lodash';

// Check if user has a certain permission for type
//
// First check if user has a global type permission and if not, whether
// there is a connection that grants him permission
export default async function hasPermission(type, permission, object, {
  rootValue: {
    db,
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
    return await hasConnectionPermissions(
      db,
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

async function hasConnectionPermissions(
  db,
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

  const validConnections = (permissions[type] || []).filter((connection) =>
    connection[permission]
  );

  for (const connection of validConnections) {
    let path = connection.path;
    let currentObject = object;
    while (path.length > 1) {
      let name;
      [name, ...path] = path;
      const pathValue = currentObject && currentObject[name];
      if (pathValue) {
        currentObject = await db.getByID(pathValue.type, pathValue);
      } else {
        currentObject = null;
      }
    }

    const value = currentObject && currentObject[path[0]];

    let isConnectedToUser = false;
    if (isArray(value)) {
      isConnectedToUser = value.some((id) => id.value === userID);
    } else if (value && value.value) {
      isConnectedToUser = value.value === userID;
    }

    if (isConnectedToUser) {
      return true;
    }
  }

  return false;
}
