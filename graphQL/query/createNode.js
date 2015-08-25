import { GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import checkPermission from '../permissions/checkPermission';

export default function createNode(typeSets, interfaces) {
  return createRootField({
    name: 'node',
    returnType: interfaces.Node,
    args: {
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    },
    resolve: (parent, args, context) => {
      checkPermission(args.id.type, 'read', args, context);
      return getByID(context.rootValue.conn, args.id);
    },
  });
}
