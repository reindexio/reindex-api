import { uniq } from 'lodash';
import { GraphQLError } from 'graphql/error/GraphQLError';

import hasPermission from './hasPermission';

export default async function checkPermission(type, permission, ...args) {
  const result = await hasPermission(type, permission, ...args);
  if (result.errors) {
    throw new GraphQLError(
      uniq(result.errors).join('\n')
    );
  }
}
