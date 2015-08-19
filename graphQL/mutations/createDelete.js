import {Map} from 'immutable';
import {GraphQLString, GraphQLNonNull, GraphQLInputObjectType} from 'graphql';
import {deleteQuery} from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createDelete({type, payload}) {
  const input = new GraphQLInputObjectType({
    name: '_Delete' + type.name + 'Input',
    fields: {
      clientMutationId: {
        name: 'clientMutationId',
        type: new GraphQLNonNull(GraphQLString),
      },
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    },
  });
  return createRootField({
    name: 'delete' + type.name,
    returnType: payload,
    args: Map({
      input: {
        type: input,
      },
    }),
    resolve(parent, {input}, {rootValue: {conn}}) {
      return deleteQuery(conn, type.name, input.id)
        .then((result) => ({
          clientMutationId: input.clientMutationId,
          [type.name]: result,
        }));
    },
  });
}
