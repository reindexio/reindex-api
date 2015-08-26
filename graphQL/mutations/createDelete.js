import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { deleteQuery } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import checkPermissionValidator from '../validators/checkPermissionValidator';

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
  return createRootField({
    name: 'delete' + type.name,
    returnType: payload,
    args: {
      input: {
        type: inputType,
      },
    },
    validators: [
      checkPermissionValidator(type.name, 'delete'),
    ],
    async resolve(parent, { input }, { rootValue: { conn } }) {
      const result = await deleteQuery(conn, type.name, input.id);
      return {
        clientMutationId: input.clientMutationId,
        [type.name]: result,
      };
    },
  });
}
