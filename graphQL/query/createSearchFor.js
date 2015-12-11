import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';

export default function createSearchFor(
  { type, connection, pluralName },
  interfaces,
  typeSets
) {
  const argDefs = createConnectionArguments(
    type.name,
    (name) => typeSets[name],
  );
  argDefs.first.defaultValue = 10;

  return {
    name: 'all' + pluralName,
    description: `A connection with all objects of type \`${type.name}\``,
    type: connection,
    args: argDefs,
    resolve(parent, args, context) {
      checkPermission(type.name, 'read', {}, context);
      return context.rootValue.db.getConnectionQueries(
        type.name,
        {},
        args,
        context.rootValue,
      );
    },
  };
}
