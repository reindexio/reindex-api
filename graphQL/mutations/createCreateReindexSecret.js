import Cryptiles from 'cryptiles';
import {Map} from 'immutable';
import {GraphQLString} from 'graphql';
import createRootField from '../createRootField';
import {create} from '../../db/queries';

function generateSecret() {
  return Cryptiles.randomString(40);
}

export default function createCreateReindexSecret(typeSets) {
  const secretMutation = typeSets.get('ReindexSecret').mutation;
  return createRootField({
    name: 'createReindexSecret',
    args: Map({
      clientMutationId: {
        name: 'clientMutationId',
        type: GraphQLString,
      },
    }),
    returnType: secretMutation,
    resolve: (parent, {clientMutationId}, {conn}) => (
      create(conn, 'ReindexSecret', { value: generateSecret()})
        .then((result) => ({
          clientMutationId,
          ReindexSecret: result,
        }))
    ),
  });
}
