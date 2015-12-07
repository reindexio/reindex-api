import { omit } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
import validate from '../validation/validate';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import clientMutationIdField from '../utilities/clientMutationIdField';
import createInputObjectFields from '../createInputObjectFields';
import formatMutationResult from './formatMutationResult';

export default function createReplace(typeSet, interfaces, typeSets) {
  const type = typeSet.type;
  const payload = typeSet.payload;
  const objectFields = createInputObjectFields(
    typeSet.getInputObjectFields(),
    true,
    (name) => typeSets.get(name),
    interfaces
  );

  const inputType = new GraphQLInputObjectType({
    name: '_Replace' + type.name + 'Input',
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
    name: 'replace' + type.name,
    description: `Replaces the given \`${type.name}\` object with a new one.`,
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

      if (!db.isValidID(type.name, input.id)) {
        throw new Error(`input.id: Invalid ID for type ${type.name}`);
      }

      const existing = await db.getByID(type.name, input.id);

      if (!existing) {
        throw new Error(
          `input.id: Can not find ${type.name} object with given ID: ` +
          input.id
        );
      }

      checkPermission(
        type.name,
        'update',
        object,
        context
      );

      await validate(
        db,
        context,
        type,
        object,
        existing,
        interfaces,
      );

      const result = await db.replace(type.name, input.id, object, existing);
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
