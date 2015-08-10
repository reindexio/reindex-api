import {Map} from 'immutable';
import {GraphQLString, GraphQLNonNull} from 'graphql';
import {deleteQuery} from '../../db/queries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createDelete({type, mutation}) {
  return createRootField({
    name: 'delete' + type.name,
    returnType: mutation,
    args: Map({
      clientMutationId: {
        name: 'clientMutationId',
        type: GraphQLString,
      },
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    }),
    resolve(parent, {clientMutationId, id}, {conn}) {
      return deleteQuery(conn, type.name, id)
        .then((result) => ({
          clientMutationId,
          [type.name]: result,
        }));
    },
  });
}
