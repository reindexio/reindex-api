import checkPermission from '../permissions/checkPermission';

export default function checkPermissionValidator(type, permission) {
  return (...args) => {
    checkPermission(type, permission, ...args);
  };
}
