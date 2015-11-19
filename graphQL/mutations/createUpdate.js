import { omit } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import ReindexID from '../builtins/ReindexID';
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
    (name) => typeSets.get(name),
    interfaces
  );

  const inputType = new GraphQLInputObjectType({
    name: '_Update' + type.name + 'Input',
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
    name: 'update' + type.name,
    description: `Updates the given \`${type.name}\` object. ` +
      'The given fields are merged to the existing object.',
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const db = context.rootValue.db;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['id', 'clientMutationId']);

      if (input.id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }

      const existing = await db.getByID(input.id);

      if (!existing) {
        throw new Error(`Can not find ${type.name} object with given id.`);
      }

      const checkObject = {
        ...existing,
        ...object,
      };

      checkPermission(
        type.name,
        'update',
        checkObject,
        context
      );

      await validate(
        db,
        context,
        type,
        checkObject,
        existing
      );

      const result = await db.update(type.name, input.id, object);
      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        db,
        context.rootValue.hooks,
        type.name,
        'afterUpdate',
        formattedResult
      );

      return formattedResult;
    },
  };
}
