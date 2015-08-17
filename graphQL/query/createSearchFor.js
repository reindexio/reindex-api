import createRootField from '../createRootField';
import {getConnectionQueries} from '../../db/queries/connections';
import {
  createConnectionArguments,
} from '../connections';

export default function createSearch({type, connection}) {
  return createRootField({
    name: 'searchFor' + type.name,
    returnType: connection,
    args: createConnectionArguments(),
    resolve(
      parent,
      args,
      {rootValue: {conn, indexes}}
    ) {
      return getConnectionQueries(
        conn,
        type.name,
        indexes.get(type.name),
        {},
        args
      );
    },
  });
}
