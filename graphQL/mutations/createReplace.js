import { omit, pick } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';

import { UserError } from '../UserError';
import {
  getReplaceMutationName,
  getReplaceInputObjectTypeName,
} from '../derivedNames';
import ReindexID, { toReindexID } from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
import validate from '../validation/validate';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import clientMutationIdField from '../utilities/clientMutationIdField';
import createInputObjectFields from '../createInputObjectFields';
import formatMutationResult from './formatMutationResult';

export default function createReplace(typeSet, typeRegistry) {
  const type = typeSet.type;
  const payload = typeSet.payload;
  const objectFields = createInputObjectFields(
    typeSet.getInputObjectFields(),
    true,
    typeRegistry,
  );

  const inputType = new GraphQLInputObjectType({
    name: getReplaceInputObjectTypeName(type.name),
    fields: {
      ...objectFields,
      clientMutationId: clientMutationIdField,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the replaced object.',
      },
    },
  });

  return {
    name: getReplaceMutationName(type.name),
    description: `Replaces the given \`${type.name}\` object with a new one.`,
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const db = context.db;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['id', 'clientMutationId']);

      if (!db.isValidID(type.name, input.id)) {
        throw new UserError(`input.id: Invalid ID for type ${type.name}`);
      }

      const existing = await db.getByID(type.name, input.id);

      if (!existing) {
        throw new UserError(
          `input.id: Can not find ${type.name} object with given ID: ` +
          toReindexID(input.id)
        );
      }

      await checkPermission(
        type.name,
        'replace',
        existing,
        object,
        context
      );

      await validate(
        db,
        context,
        type,
        object,
        existing,
        typeRegistry
      );

      const cleanedExisting = omit(
        existing,
        Object.keys(
          pick(
            typeSet.connectionTypes,
            (connectionType) => connectionType === 'MANY_TO_MANY',
          ),
        ),
      );

      const result = await db.replace(
        type.name,
        input.id,
        object,
        cleanedExisting
      );

      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        db,
        context.hooks,
        type.name,
        'afterUpdate',
        clientMutationId,
        result,
      );

      return formattedResult;
    },
  };
}
