import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';
import { getAllQueryName } from '../derivedNames';

export default function createAllNodes(
  { type, connection, pluralName },
  interfaces,
  typeSets
) {
  return {
    name: getAllQueryName(type.name, pluralName),
    description: `A connection with all objects of type \`${type.name}\``,
    type: connection,
    args: createConnectionArguments(
      type.name,
      (name) => typeSets[name],
    ),
    async resolve(parent, args, context) {
      await checkPermission(type.name, 'read', {}, {}, context);
      return context.rootValue.db.getConnectionQueries(
        type.name,
        {},
        args,
        context.rootValue,
      );
    },
  };
}
