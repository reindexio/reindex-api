import Cryptiles from 'cryptiles';
import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import createRootField from '../createRootField';
import { create } from '../../db/queries/mutationQueries';
import checkPermissionValidator from '../validators/checkPermissionValidator';

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
        type: new GraphQLNonNull(GraphQLString),
      },
    },
  });
  return createRootField({
    name: 'createReindexSecret',
    args: {
      input: {
        type: input,
      },
    },
    returnType: secretPayload,
    validators: [
      checkPermissionValidator('ReindexSecret', 'create'),
    ],
    async resolve(
      parent,
      { input: { clientMutationId } },
      { rootValue: { conn } }
    ) {
      const result = await create(conn, 'ReindexSecret', {
        value: generateSecret(),
      });
      return {
        clientMutationId,
        ReindexSecret: result,
      };
    },
  });
}
