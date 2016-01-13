import { uniq } from 'lodash';
import hasPermission from './hasPermission';

export default async function checkPermission(type, permission, ...args) {
  const result = await hasPermission(type, permission, ...args);
  if (result.errors) {
    throw new Error(
      uniq(result.errors).join('\n')
    );
  }
}
