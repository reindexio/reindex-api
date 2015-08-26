import hasPermission from './hasPermission';

export default function checkPermission(type, permission, ...args) {
  if (!hasPermission(type, permission, ...args)) {
    throw new Error(
      `User lacks permissions to ${permission} records of type ${type}`
    );
  }
}
