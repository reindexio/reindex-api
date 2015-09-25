import { getConnectionQueries } from '../../db/queries/connectionQueries';
import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';

export default function createSearchFor(
  { type, connection },
  interfaces,
  typeSets
) {
  const argDefs = createConnectionArguments(
    (name) => typeSets.get(name),
    interfaces
  );
  argDefs.first.defaultValue = 10;

  return {
    name: 'all' + type.name,
    type: connection,
    args: argDefs,
    resolve(parent, args, context) {
      checkPermission(type.name, 'read', {}, context);
      return getConnectionQueries(
        context.rootValue.conn,
        type.name,
        context.rootValue.indexes[type.name],
        {},
        args
      );
    },
  };
}
