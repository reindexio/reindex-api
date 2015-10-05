import { GraphQLInputObjectType } from 'graphql';
import { createType } from '../../db/queries/mutationQueries';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import createInputObjectFields from '../createInputObjectFields';
import formatMutationResult from './formatMutationResult';

export default function createCreateReindexType(typeSets, interfaces) {
  const ReindexTypeSet = typeSets.get('ReindexType');

  const objectFields = createInputObjectFields(
    ReindexTypeSet.getInputObjectFields(),
    true,
    (name) => typeSets.get(name),
    interfaces
  );

  const input = new GraphQLInputObjectType({
    name: '_CreateReindexTypeInput',
    fields: {
      ...objectFields,
      clientMutationId: clientMutationIdField,
    },
  });
  return {
    name: 'createReindexType',
    type: ReindexTypeSet.payload,
    args: {
      input: {
        type: input,
      },
    },
    async resolve(
      parent,
      { input: { clientMutationId, ...type } },
      context,
    ) {
      checkPermission('ReindexType', 'create', {}, context);
      const result = await createType(context.rootValue.conn, type);
      return formatMutationResult(clientMutationId, 'ReindexType', result);
    },
  };
}
