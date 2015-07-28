import createRootField from '../createRootField';
import {getAll, processConnectionQuery} from '../../db/queries';
import {
  createConnectionArguments,
} from '../connections';

export default function createSearch({type, connection}) {
  return createRootField({
    name: 'searchFor' + type.name,
    returnType: connection,
    args: createConnectionArguments(),
    resolve: (parent, args, {dbContext}) => (
      processConnectionQuery(getAll(dbContext, type.name), args)
    ),
  });
}
