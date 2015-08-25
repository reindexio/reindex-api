export default function hasPermission(type, permission, args, {
  rootValue: {
    credentials,
    permissions,
  },
}) {
  if (credentials.isAdmin) {
    return true;
  }

  const permissionsByUser = permissions[type] || {};
  const userID = credentials.userID;
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
