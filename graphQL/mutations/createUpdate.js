import { omit } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { getByID } from '../../db/queries/simpleQueries';
import { update } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
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
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['id', 'clientMutationId']);

      if (input.id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }

      const existing = await getByID(conn, input.id);
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

      const result = await update(conn, type.name, input.id, object);
      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        conn,
        context.rootValue.hooks,
        type.name,
        'afterUpdate',
        formattedResult
      );

      return formattedResult;
    },
  };
}
