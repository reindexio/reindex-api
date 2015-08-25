import { GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import checkPermissionValidator from '../validators/checkPermissionValidator';

export default function createGet({ type }) {
  return createRootField({
    name: 'get' + type.name,
    returnType: type,
    args: {
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(ReindexID),
      },
    },
    validators: [
      checkPermissionValidator(type.name, 'read'),
    ],
    resolve: (parent, { id }, { rootValue: { conn } }) => (
      getByID(conn, id)
    ),
  });
}
