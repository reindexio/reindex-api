import { GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';

export default function createGet({ type }) {
  return {
    name: 'get' + type.name,
    type,
    args: {
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(ReindexID),
      },
    },
    async resolve(parent, { id }, context) {
      if (id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }
      const result = await getByID(context.rootValue.conn, id);
      checkPermission(type.name, 'read', result, context);
      return result;
    },
  };
}
