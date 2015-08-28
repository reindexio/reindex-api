import { GraphQLString, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import * as queries from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';

const OP_TO_PERMISSION = {
  create: 'create',
  update: 'update',
  replace: 'update',
};

export default function createCRU(operation, withID, {
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

  if (withID) {
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

  return {
    name: operation + type.name,
    type: payload,
    args: {
      input: {
        type: inputType,
      },
    },
    async resolve(parent, { input }, context) {
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;
      const object = input[type.name] || {};

      let queryArgs;
      let checkObject = object;

      if (withID) {
        if (input.id.type !== type.name) {
          throw new Error(`Invalid ID`);
        }

        if (operation === 'update') {
          const existing = await getByID(conn, input.id);
          checkObject = {
            ...existing,
            ...object,
          };
        }

        queryArgs = [conn, type.name, input.id, object];
      } else {
        queryArgs = [conn, type.name, object];
      }

      checkPermission(
        type.name,
        OP_TO_PERMISSION[operation],
        checkObject,
        context
      );

      const result = await queries[operation](...queryArgs);
      return {
        clientMutationId,
        [type.name]: result,
      };
    },
  };
}
