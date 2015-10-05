import {
  GraphQLNonNull,
  GraphQLInputObjectType,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import { deleteType } from '../../db/queries/mutationQueries';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import formatMutationResult from './formatMutationResult';

export default function createDeleteReindexType(typeSets) {
  const ReindexTypeSet = typeSets.get('ReindexType');
  const input = new GraphQLInputObjectType({
    name: '_DeleteReindexTypeInput',
    fields: {
      clientMutationId: clientMutationIdField,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the deleted type.',
      },
    },
  });
  return {
    name: 'deleteReindexType',
    type: ReindexTypeSet.payload,
    args: {
      input: {
        type: input,
      },
    },
    async resolve(
      parent,
      { input: { clientMutationId, id } },
      context
    ) {
      checkPermission('ReindexType', 'delete', {}, context);
      const result = await deleteType(context.rootValue.conn, id);
      return formatMutationResult(clientMutationId, 'ReindexType', result);
    },
  };
}
