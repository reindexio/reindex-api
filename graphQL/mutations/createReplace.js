import { omit } from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { replace } from '../../db/queries/mutationQueries';
import ReindexID from '../builtins/ReindexID';
import checkPermission from '../permissions/checkPermission';
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
    description: `Replaces the given \`${type.name}\` object.`,
    type: payload,
    args: {
      input: {
        type: inputType,
      },
    },
    async resolve(parent, { input }, context) {
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['id', 'clientMutationId']);

      if (input.id.type !== type.name) {
        throw new Error(`Invalid ID`);
      }

      checkPermission(
        type.name,
        'update',
        object,
        context
      );

      const result = await replace(conn, type.name, input.id, object);

      return formatMutationResult(clientMutationId, type.name, result);
    },
  };
}
