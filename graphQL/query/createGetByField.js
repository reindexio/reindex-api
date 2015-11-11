import { GraphQLNonNull } from 'graphql';
import { chain, capitalize } from 'lodash';

import { getByIndex } from '../../db/queries/simpleQueries';
import checkPermission from '../permissions/checkPermission';

export default function createGetByField({ type }) {
  return chain(type.getFields())
    .filter((field) => field.metadata && field.metadata.unique)
    .map((field) => ({
      name: 'get' + type.name + 'By' + capitalize(field.name),
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
        const value = args[field.name];
        const result = await getByIndex(
          context.rootValue.conn,
          type.name,
          context.rootValue.indexes[type.name],
          field.name,
          value
        );
        checkPermission(type.name, 'read', result, context);
        return result;
      },
    }))
    .value();
}
