import { omit } from 'lodash';

import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';

import {
  getCreateMutationName,
  getCreateInputObjectTypeName,
} from '../derivedNames';
import clientMutationIdField from '../utilities/clientMutationIdField';
import checkPermission from '../permissions/checkPermission';
import validate from '../validation/validate';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import createInputObjectFields from '../createInputObjectFields';
import formatMutationResult from './formatMutationResult';

export default function createCreate(typeSet, interfaces, typeSets) {
  const type = typeSet.type;
  const payload = typeSet.payload;
  const objectFields = createInputObjectFields(
    typeSet.getInputObjectFields(),
    true,
    (name) => typeSets[name],
    interfaces
  );

  const inputType = new GraphQLInputObjectType({
    name: getCreateInputObjectTypeName(type.name),
    fields: {
      ...objectFields,
      clientMutationId: clientMutationIdField,
    },
  });

  const name = getCreateMutationName(type.name);

  return {
    name,
    description: `Creates a new \`${type.name}\` object`,
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const db = context.db;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['clientMutationId']);

      await checkPermission(
        type.name,
        'create',
        {},
        object,
        context,
      );

      await validate(
        db,
        context,
        type,
        object,
        undefined,
        interfaces,
      );

      const result = await db.create(type.name, object);
      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        db,
        context.hooks,
        type.name,
        'afterCreate',
        clientMutationId,
        result,
      );

      return formattedResult;
    },
  };
}
