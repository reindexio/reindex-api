import { GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import { deleteQuery } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import clientMutationIdField from '../utilities/clientMutationIdField';
import formatMutationResult from './formatMutationResult';

export default function createDelete({ type, payload }) {
  const inputType = new GraphQLInputObjectType({
    name: '_Delete' + type.name + 'Input',
    fields: {
      clientMutationId: clientMutationIdField,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the deleted object.',
      },
    },
  });
  return {
    name: 'delete' + type.name,
    description: `Deletes the given \`${type.name}\` object`,
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;
      if (input.id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }
      const object = await getByID(conn, input.id);

      if (!object) {
        throw new Error(`Can not find ${type.name} object with given id.`);
      }

      checkPermission(
        type.name,
        'delete',
        object,
        context
      );
      const result = await deleteQuery(conn, type.name, input.id);
      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        conn,
        context.rootValue.hooks,
        type.name,
        'afterDelete',
        formattedResult
      );

      return formattedResult;
    },
  };
}
