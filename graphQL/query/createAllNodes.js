import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';
import { getAllQueryName } from '../derivedNames';
import { processFilters } from '../filters';

export default function createAllNodes(typeSet, typeRegistry) {
  const { type, connection, pluralName } = typeSet;
  return {
    name: getAllQueryName(type.name, pluralName),
    description: `A connection with all objects of type \`${type.name}\``,
    type: connection,
    args: createConnectionArguments(type.name, typeRegistry),
    async resolve(parent, args, context) {
      await checkPermission(type.name, 'read', {}, {}, context);
      return context.db.getConnectionQueries(
        type.name,
        processFilters(typeSet, args),
        args,
        context,
      );
    },
  };
}
