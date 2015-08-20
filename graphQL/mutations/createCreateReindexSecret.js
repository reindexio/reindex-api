import Cryptiles from 'cryptiles';
import { Map } from 'immutable';
import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import createRootField from '../createRootField';
import { create } from '../../db/queries/mutationQueries';

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
    args: Map({
      input: {
        type: input,
      },
    }),
    returnType: secretPayload,
    resolve(parent, { input: { clientMutationId } }, { rootValue: { conn } }) {
      return create(conn, 'ReindexSecret', { value: generateSecret() })
        .then((result) => ({
          clientMutationId,
          ReindexSecret: result,
        }));
    },
  });
}
