import { GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';

export default function createNode(typeSets, interfaces) {
  return {
    name: 'node',
    type: interfaces.Node,
    args: {
      id: {
        type: new GraphQLNonNull(ReindexID),
      },
    },
    async resolve(parent, { id }, context) {
      const result = await getByID(context.rootValue.conn, id);
      checkPermission(id.type, 'read', result, context);
      return result;
    },
  };
}
