import {Map} from 'immutable';
import {GraphQLID, GraphQLNonNull} from 'graphql';
import {deleteQuery} from '../../db/queries';
import createRootField from '../createRootField';

export default function createDelete({type, mutation}) {
  return createRootField({
    name: 'delete' + type.name,
    returnType: mutation,
    args: Map({
      clientMutationId: {
        name: 'clientMutationId',
        type: GraphQLID,
      },
      id: {
        name: 'id',
        type: new GraphQLNonNull(GraphQLID),
      },
    }),
    resolve(parent, {clientMutationId, id}, {dbContext}) {
      return deleteQuery(dbContext, type.name, id)
        .run(dbContext.conn)
        .then((result) => ({
          clientMutationId,
          [type.name]: result,
        }));
    },
  });
}
