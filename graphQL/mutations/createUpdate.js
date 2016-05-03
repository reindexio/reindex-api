import { omit } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';

import { UserError } from '../UserError';
import ReindexID, { toReindexID } from '../builtins/ReindexID';
import {
  getUpdateMutationName,
  getUpdateInputObjectTypeName,
} from '../derivedNames';
import checkPermission from '../permissions/checkPermission';
import validate from '../validation/validate';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import clientMutationIdField from '../utilities/clientMutationIdField';
import createInputObjectFields from '../createInputObjectFields';
import formatMutationResult from './formatMutationResult';

export default function createUpdate(typeSet, interfaces, typeSets) {
  const type = typeSet.type;
  const payload = typeSet.payload;
  const objectFields = createInputObjectFields(
    typeSet.getInputObjectFields(),
    false,
    (name) => typeSets[name],
    interfaces
  );

  const inputType = new GraphQLInputObjectType({
    name: getUpdateInputObjectTypeName(type.name),
    fields: {
      ...objectFields,
      clientMutationId: clientMutationIdField,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the updated object.',
      },
    },
  });

  return {
    name: getUpdateMutationName(type.name),
    description: `Updates the given \`${type.name}\` object. ` +
      'The given fields are merged to the existing object.',
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

      const checkObject = {
        ...existing,
        ...object,
      };

      await checkPermission(
        type.name,
        'update',
        existing,
        object,
        context
      );

      await validate(
        db,
        context,
        type,
        checkObject,
        existing,
        interfaces,
      );

      const result = await db.update(type.name, input.id, object);
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
