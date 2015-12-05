import { GraphQLNonNull } from 'graphql';
import { camelCase } from 'lodash';

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
      const { db } = context.rootValue;
      if (!db.isValidID(type.name, id)) {
        throw new Error(`id: Invalid ID for type ${type.name}`);
      }
      const result = await db.getByID(type.name, id);
      checkPermission(type.name, 'read', result, context);
      return result;
    },
  };
}
