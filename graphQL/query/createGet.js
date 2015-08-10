import {Map} from 'immutable';
import {GraphQLNonNull} from 'graphql';
import {getByID} from '../../db/queries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createGet({type}) {
  return createRootField({
    name: 'get' + type.name,
    returnType: type,
    args: Map({
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(ReindexID),
      },
    }),
    resolve: (parent, {id}, {conn}) => (
      getByID(conn, id)
    ),
  });
}
