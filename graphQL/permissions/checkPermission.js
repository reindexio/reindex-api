import hasPermission from './hasPermission';

export default async function checkPermission(type, permission, ...args) {
  const result = await hasPermission(type, permission, ...args);
  if (!result) {
    throw new Error(
      `User lacks permissions to ${permission} records of type ${type}`
    );
  }
}
