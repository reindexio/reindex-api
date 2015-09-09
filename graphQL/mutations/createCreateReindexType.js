import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { createType } from '../../db/queries/mutationQueries';
import checkPermission from '../permissions/checkPermission';

export default function createCreateReindexType(typeSets, interfaces) {
  const ReindexTypeSet = typeSets.get('ReindexType');
  const input = new GraphQLInputObjectType({
    name: '_CreateReindexTypeInput',
    fields: {
      clientMutationId: {
        type: new GraphQLNonNull(GraphQLString),
      },
      ReindexType: {
        type: ReindexTypeSet.getInputObject(
          (name) => typeSets.get(name),
          interfaces,
        ),
      },
    },
  });
  return {
    name: 'createReindexType',
    type: ReindexTypeSet.payload,
    args: {
      input: {
        type: input,
      },
    },
    async resolve(
      parent,
      { input: { clientMutationId, ReindexType: type } },
      context,
    ) {
      checkPermission('ReindexType', 'create', {}, context);
      const result = await createType(context.rootValue.conn, type);
      return {
        clientMutationId,
        ReindexType: result,
      };
    },
  };
}
