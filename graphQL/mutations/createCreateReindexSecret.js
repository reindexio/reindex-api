import Cryptiles from 'cryptiles';
import { GraphQLInputObjectType } from 'graphql';
import { create } from '../../db/queries/mutationQueries';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import formatMutationResult from './formatMutationResult';

function generateSecret() {
  return Cryptiles.randomString(40);
}

export default function createCreateReindexSecret(typeSets) {
  const secretPayload = typeSets.get('ReindexSecret').payload;
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
      return formatMutationResult(clientMutationId, 'ReindexSecret', result);
    },
  };
}
