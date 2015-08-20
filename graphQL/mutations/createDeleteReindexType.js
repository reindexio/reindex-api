import { Map } from 'immutable';
import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLInputObjectType,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import { deleteType } from '../../db/queries/mutationQueries';

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
    args: Map({
      input: {
        type: input,
      },
    }),
    returnType: ReindexTypeSet.payload,
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
