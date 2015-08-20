import { Map } from 'immutable';
import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import * as queries from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createCRU(operation, getById, {
  type,
  inputObject,
  payload,
}) {
  let inputFields = Map({
    clientMutationId: {
      name: 'clientMutationId',
      type: new GraphQLNonNull(GraphQLString),
    },
  });

  if (getById) {
    inputFields = inputFields.set('id', {
      name: 'id',
      type: new GraphQLNonNull(ReindexID),
    });
  }

  if (inputObject) {
    inputFields = inputFields.set(type.name, {
      name: type.name,
      type: new GraphQLNonNull(inputObject),
    });
  }

  const inputType = new GraphQLInputObjectType({
    name: (
      '_' +
      operation.charAt(0).toUpperCase() + operation.substr(1) +
      type.name + 'Input'
    ),
    fields: inputFields.toObject(),
  });

  return createRootField({
    name: operation + type.name,
    returnType: payload,
    args: Map({
      input: {
        type: inputType,
      },
    }),
    async resolve(parent, { input }, { rootValue: { conn } }) {
      const clientMutationId = input.clientMutationId;
      const object = input[type.name] || {};
      let queryArgs;
      if (getById) {
        queryArgs = [conn, type.name, input.id, object];
      } else {
        queryArgs = [conn, type.name, object];
      }
      const result = await queries[operation](...queryArgs);
      return {
        clientMutationId,
        [type.name]: result,
      };
    },
  });
}
