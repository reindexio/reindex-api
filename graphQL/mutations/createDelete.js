import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import { deleteQuery } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
import formatMutationResult from './formatMutationResult';

export default function createDelete({ type, payload }) {
  const inputType = new GraphQLInputObjectType({
    name: '_Delete' + type.name + 'Input',
    fields: {
      clientMutationId: {
        name: 'clientMutationId',
        type: GraphQLString,
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
      const clientMutationId = input.clientMutationId;
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

      return formatMutationResult(clientMutationId, type.name, result);
    },
  };
}
