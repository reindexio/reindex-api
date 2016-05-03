import { camelCase } from 'lodash';
import { GraphQLNonNull } from 'graphql';

import { UserError } from '../UserError';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';

export default function createGet({ type }) {
  return {
    name: 'get' + type.name,
    description: `Get an object of type \`${type.name}\` by ID.`,
    type,
    deprecationReason: `Use \`${camelCase(type.name)}ById\`.`,
    args: {
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(ReindexID),
      },
    },
    async resolve(parent, { id }, context) {
      const { db } = context;
      if (!db.isValidID(type.name, id)) {
        throw new UserError(`id: Invalid ID for type ${type.name}`);
      }
      const result = await db.getByID(type.name, id);
      await checkPermission(type.name, 'read', {}, result, context);
      return result;
    },
  };
}
