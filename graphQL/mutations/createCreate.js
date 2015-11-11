import { omit } from 'lodash';

import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';

import { create } from '../../db/queries/mutationQueries';
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
    (name) => typeSets.get(name),
    interfaces
  );

  const inputType = new GraphQLInputObjectType({
    name: '_Create' + type.name + 'Input',
    fields: {
      ...objectFields,
      clientMutationId: clientMutationIdField,
    },
  });

  const name = `create${type.name}`;

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
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;
      const object = omit(input, ['clientMutationId']);

      checkPermission(
        type.name,
        'create',
        object,
        context
      );

      await validate(
        conn,
        context,
        type,
        object
      );

      const result = await create(conn, type.name, object);
      const formattedResult = formatMutationResult(
        clientMutationId,
        type.name,
        result
      );

      checkAndEnqueueHooks(
        conn,
        context.rootValue.hooks,
        type.name,
        'afterCreate',
        formattedResult
      );

      return formattedResult;
    },
  };
}
