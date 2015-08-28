import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import { deleteQuery } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';

export default function createDelete({ type, payload }) {
  const inputType = new GraphQLInputObjectType({
    name: '_Delete' + type.name + 'Input',
    fields: {
      clientMutationId: {
        name: 'clientMutationId',
        type: new GraphQLNonNull(GraphQLString),
      },
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    },
  });
  return {
    name: 'delete' + type.name,
    type: payload,
    args: {
      input: {
        type: inputType,
      },
    },
    async resolve(parent, { input }, context) {
      const conn = context.rootValue.conn;
      if (input.id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }
      const object = await getByID(conn, input.id);
      checkPermission(
        type.name,
        'delete',
        object,
        context
      );
      const result = await deleteQuery(conn, type.name, input.id);
      return {
        clientMutationId: input.clientMutationId,
        [type.name]: result,
      };
    },
  };
}
