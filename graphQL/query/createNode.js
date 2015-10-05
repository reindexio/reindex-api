import { GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import ReindexID from '../builtins/ReindexID';
import { isViewerID } from '../builtins/createViewer';
import checkPermission from '../permissions/checkPermission';

export default function createNode(typeSets, interfaces) {
  return {
    name: 'node',
    description: 'Get any Node by ID.',
    type: interfaces.Node,
    args: {
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the object.',
      },
    },
    async resolve(parent, { id }, context) {
      if (isViewerID(id)) {
        return {
          id,
        };
      }
      const result = await getByID(context.rootValue.conn, id);
      checkPermission(id.type, 'read', result, context);
      return result;
    },
  };
}
