import { getConnectionQueries } from '../../db/queries/connectionQueries';
import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';

export default function createSearch({ type, connection }) {
  return {
    name: 'searchFor' + type.name,
    type: connection,
    args: createConnectionArguments(),
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
