import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import * as queries from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';
import checkPermissionValidator from '../validators/checkPermissionValidator';

const OP_TO_PERMISSION = {
  create: 'create',
  update: 'update',
  replace: 'update',
};

export default function createCRU(operation, getById, {
  type,
  inputObject,
  payload,
}) {
  const inputFields = {
    clientMutationId: {
      name: 'clientMutationId',
      type: new GraphQLNonNull(GraphQLString),
    },
  };

  if (getById) {
    inputFields.id = {
      name: 'id',
      type: new GraphQLNonNull(ReindexID),
    };
  }

  if (inputObject) {
    inputFields[type.name] = {
      name: type.name,
      type: new GraphQLNonNull(inputObject),
    };
  }

  const inputType = new GraphQLInputObjectType({
    name: (
      '_' +
      operation.charAt(0).toUpperCase() + operation.substr(1) +
      type.name + 'Input'
    ),
    fields: inputFields,
  });

  return createRootField({
    name: operation + type.name,
    returnType: payload,
    args: {
      input: {
        type: inputType,
      },
    },
    validators: [
      checkPermissionValidator(type.name, OP_TO_PERMISSION[operation]),
    ],
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
