import Cryptiles from 'cryptiles';
import {Map} from 'immutable';
import {GraphQLID} from 'graphql';
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
        type: GraphQLID,
      },
    }),
    returnType: secretMutation,
    resolve: (parent, {clientMutationId}, {dbContext}) => (
      create(dbContext, 'ReindexSecret', {
        value: generateSecret(),
      }).run(dbContext.conn).then((result) => ({
        clientMutationId,
        ReindexSecret: result,
      }))
    ),
  });
}
