import {List} from 'immutable';
import createOperation from '../createOperation';
import {getAll, processConnectionQuery} from '../../db/queries';
import {
  createConnectionArguments,
} from '../connections';

export default function createSearch({type, connection}) {
  return createOperation(
    'searchFor' + type.name,
    connection,
    createConnectionArguments(),
    List(),
    (parent, args, {dbContext}) => (
      processConnectionQuery(getAll(dbContext, type.name), args)
    ),
  );
}
