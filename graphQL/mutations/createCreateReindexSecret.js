import Cryptiles from 'cryptiles';
import { GraphQLString, GraphQLInputObjectType } from 'graphql';
import { create } from '../../db/queries/mutationQueries';
import checkPermission from '../permissions/checkPermission';

function generateSecret() {
  return Cryptiles.randomString(40);
}

export default function createCreateReindexSecret(typeSets) {
  const secretPayload = typeSets.get('ReindexSecret').payload;
  const input = new GraphQLInputObjectType({
    name: '_CreateReindexSecretInput',
    fields: {
      clientMutationId: {
        name: 'clientMutationId',
        type: GraphQLString,
      },
    },
  });
  return {
    name: 'createReindexSecret',
    type: secretPayload,
    args: {
      input: {
        type: input,
      },
    },
    async resolve(
      parent,
      { input: { clientMutationId } },
      context,
    ) {
      checkPermission('ReindexSecret', 'create', {}, context);
      const result = await create(context.rootValue.conn, 'ReindexSecret', {
        value: generateSecret(),
      });
      return {
        clientMutationId,
        changedReindexSecret: result,
      };
    },
  };
}
