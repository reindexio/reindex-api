import { uniq } from 'lodash';

import { UserError } from '../UserError';
import hasPermission from './hasPermission';

export default async function checkPermission(type, permission, ...args) {
  const result = await hasPermission(type, permission, ...args);
  if (result.errors) {
    throw new UserError(
      uniq(result.errors).join('\n')
    );
  }
}
