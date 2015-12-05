import { GraphQLNonNull } from 'graphql';
import { chain, capitalize, camelCase } from 'lodash';

import checkPermission from '../permissions/checkPermission';

export default function createGetByField({ type }) {
  return chain(type.getFields())
    .filter((field) => field.metadata && field.metadata.unique)
    .map((field) => ({
      name: camelCase(type.name) + 'By' + capitalize(field.name),
      description:
`Get an object of type \`${type.name}\` by \`${field.name}\``,
      type,
      args: {
        [field.name]: {
          name: field.name,
          description: `${field.name} of ${type.name}`,
          type: new GraphQLNonNull(field.type.ofType || field.type),
        },
      },
      async resolve(parent, args, context) {
        const { db } = context.rootValue;
        const value = args[field.name];
        if (field.name === 'id' && !db.isValidID(type.name, value)) {
          throw new Error(`id: Invalid ID for type ${type.name}`);
        }
        const result = await db.getByField(
          type.name,
          field.name,
          value,
          context.rootValue.indexes[type.name],
        );
        checkPermission(type.name, 'read', result, context);
        return result;
      },
    }))
    .value();
}
