import { GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { GraphQLError } from 'graphql/error/GraphQLError';

import {
  getDeleteMutationName,
  getDeleteInputObjectTypeName,
} from '../derivedNames';
import ReindexID, { toReindexID } from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import updateRelatedObjects from '../hooks/updateRelatedObjects';
import clientMutationIdField from '../utilities/clientMutationIdField';
import formatMutationResult from './formatMutationResult';

export default function createDelete({ type, payload }) {
  const inputType = new GraphQLInputObjectType({
    name: getDeleteInputObjectTypeName(type.name),
    fields: {
      clientMutationId: clientMutationIdField,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the deleted object.',
      },
    },
  });
  return {
    name: getDeleteMutationName(type.name),
    description: `Deletes the given \`${type.name}\` object`,
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const db = context.rootValue.db;
      const clientMutationId = input.clientMutationId;
      if (!db.isValidID(type.name, input.id)) {
        throw new GraphQLError(`input.id: Invalid ID for type ${type.name}`);
      }
      const object = await db.getByID(type.name, input.id);

      if (!object) {
        throw new GraphQLError(
          `input.id: Can not find ${type.name} object with given ID: ` +
          toReindexID(input.id)
        );
      }

      await checkPermission(
        type.name,
        'delete',
        object,
        {},
        context
      );
      const result = await db.deleteQuery(type.name, input.id);

      await updateRelatedObjects(type.name, object, context);

      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        db,
        context.rootValue.hooks,
        type.name,
        'afterDelete',
        clientMutationId,
        result,
      );

      return formattedResult;
    },
  };
}
