import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLInputObjectType,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import { deleteType } from '../../db/queries/mutationQueries';
import checkPermissionValidator from '../validators/checkPermissionValidator';

export default function createCreateReindexType(typeSets) {
  const ReindexTypeSet = typeSets.get('ReindexType');
  const input = new GraphQLInputObjectType({
    name: '_DeleteReindexTypeInput',
    fields: {
      clientMutationId: {
        type: new GraphQLNonNull(GraphQLString),
      },
      id: {
        type: new GraphQLNonNull(ReindexID),
      },
    },
  });
  return createRootField({
    name: 'deleteReindexType',
    args: {
      input: {
        type: input,
      },
    },
    returnType: ReindexTypeSet.payload,
    validators: [
      checkPermissionValidator('ReindexType', 'delete'),
    ],
    async resolve(
      parent,
      { input: { clientMutationId, id } },
      { rootValue: { conn } }
    ) {
      const result = await deleteType(conn, id);
      return {
        clientMutationId,
        ReindexType: result,
      };
    },
  });
}
