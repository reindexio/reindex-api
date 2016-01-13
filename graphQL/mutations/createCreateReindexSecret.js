import Cryptiles from 'cryptiles';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import formatMutationResult from './formatMutationResult';

function generateSecret() {
  return Cryptiles.randomString(40);
}

export default function createCreateReindexSecret(typeSets) {
  const secretPayload = typeSets.ReindexSecret.payload;
  const input = new GraphQLInputObjectType({
    name: '_CreateReindexSecretInput',
    fields: {
      clientMutationId: clientMutationIdField,
    },
  });
  return {
    name: 'createReindexSecret',
    description: 'Creates a new `ReindexSecret` object.',
    type: secretPayload,
    args: {
      input: {
        type: new GraphQLNonNull(input),
      },
    },
    async resolve(
      parent,
      { input: { clientMutationId } },
      context,
    ) {
      await checkPermission('ReindexSecret', 'create', {}, {}, context);
      const result = await context.rootValue.db.create('ReindexSecret', {
        value: generateSecret(),
      });
      return formatMutationResult(clientMutationId, 'ReindexSecret', result);
    },
  };
}
