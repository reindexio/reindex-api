import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
} from 'graphql';
import { chain, capitalize, camelCase } from 'lodash';

import checkPermission from '../permissions/checkPermission';
import ReindexID, { toReindexID } from '../builtins/ReindexID';
import clientMutationIdField from '../utilities/clientMutationIdField';
import checkAndEnqueueHooks from '../hooks/checkAndEnqueueHooks';
import formatMutationResult from './formatMutationResult';

export default function createConnectionMutations(
  { type, edge },
  interfaces,
  typeSets
) {
  return chain(type.getFields())
    .filter((field) => {
      if (field.metadata && field.metadata.type === 'Connection') {
        const ofTypeFields = typeSets[field.metadata.ofType].type.getFields();
        const reverseField = ofTypeFields[field.metadata.reverseName];
        if (reverseField.metadata &&
            reverseField.metadata.type === 'Connection') {
          return true;
        }
      }
      return false;
    })
    .map((field) => createMutationsFromConnectionField(
      field, type, edge, typeSets,
    ))
    .flatten()
    .value();
}

function createMutationsFromConnectionField(field, toType, toEdge, typeSets) {
  const toTypeName = toType.name;
  const fromTypeName = field.metadata.ofType;
  const fromTypeSet = typeSets[fromTypeName];
  const { type: fromType, edge: fromEdge } = fromTypeSet;
  const reverseName = field.metadata.reverseName;

  const fromArg = camelCase(`${fromTypeName} id`);
  const toArg = camelCase(`${toTypeName} id`);

  const name = capitalize(camelCase(
    `${fromTypeName} ${toTypeName} ${field.name}`
  ));

  const inputType = new GraphQLInputObjectType({
    name: `_${name}ConnectionInput`,
    description: '',
    fields: {
      clientMutationId: clientMutationIdField,
      [fromArg]: {
        name: fromArg,
        type: new GraphQLNonNull(ReindexID),
        description: `ID of the ${fromTypeName}.`,
      },
      [toArg]: {
        name: toArg,
        type: new GraphQLNonNull(ReindexID),
        description: `ID of the ${toTypeName}.`,
      },
    },
  });

  const payload = new GraphQLObjectType({
    name: `_${name}Payload`,
    description:
`The payload returned from connection mutations for ${toTypeName}.${field.name}


* [Reindex docs: Mutations
](https://www.reindex.io/docs/graphql-api/mutations/)
`,
    fields: {
      clientMutationId: clientMutationIdField,
      [`changed${fromTypeName}`]: {
        type: fromType,
        description: 'The ${fromTypeName} object.',
      },
      [`changed${fromTypeName}Edge`]: {
        type: fromEdge,
        description: `A connection edge containing the ${fromTypeName} object.`,
      },
      [`changed${toTypeName}`]: {
        type: toType,
        description: 'The ${toTypeName} object.',
      },
      [`changed${toTypeName}Edge`]: {
        type: toEdge,
        description: `A connection edge containing the ${toTypeName} object.`,
      },
    },
  });

  return [
    createAddMutation(inputType, payload, {
      fromType: fromTypeName,
      fromField: reverseName,
      fromArg,
      toType: toTypeName,
      toField: field.name,
      toArg,
    }),
    createRemoveMutation(inputType, payload, {
      fromType: fromTypeName,
      fromField: reverseName,
      fromArg,
      toType: toTypeName,
      toField: field.name,
      toArg,
    }),
  ];
}

function createAddMutation(inputType, payload, {
  fromType,
  fromField,
  fromArg,
  toType,
  toField,
  toArg,
}) {
  const name = camelCase(`add ${fromType} to ${toType} ${toField}`);

  return {
    name,
    type: payload,
    description:
`Add \`${fromType}\` object to connection ${toField} of ${toType} object.`,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    resolve: createResolveFunction('addToConnection', true, {
      fromType,
      fromField,
      toType,
      toField,
      fromArg,
      toArg,
    }),
  };
}

function createRemoveMutation(inputType, payload, {
  fromType,
  fromField,
  fromArg,
  toType,
  toField,
  toArg,
}) {
  const name = camelCase(
    `remove ${fromType} from ${toType} ${toField}`
  );

  return {
    name,
    type: payload,
    description:
`Remove \`${fromType}\` object from connection ${toField} of ${toType} object.`,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    resolve: createResolveFunction('removeFromConnection', true, {
      fromType,
      fromField,
      toType,
      toField,
      fromArg,
      toArg,
    }),
  };
}

function createResolveFunction(
  operation,
  validateExistence,
  {
    fromType,
    fromField,
    fromArg,
    toType,
    toField,
    toArg,
  },
) {
  return async (parent, { input }, context) => {
    const db = context.rootValue.db;

    if (!db.hasSupport('manyToMany')) {
      throw new Error(
        'This operation is not enabled for your app. ' +
        'Please contact support.'
      );
    }

    const { clientMutationId, [toArg]: toId, [fromArg]: fromId } = input;

    if (!db.isValidID(toType, toId)) {
      throw new Error(`input.${toArg}: Invalid ID for type ${toType}`);
    }

    if (!db.isValidID(fromType, fromId)) {
      throw new Error(`input.${fromArg}: Invalid ID for type ${fromType}`);
    }

    const [fromObject, toObject] = await* [
      db.getByID(fromType, fromId),
      db.getByID(toType, toId),
    ];

    for (const [oId, typeName, object, arg] of [
      [fromId, fromType, fromObject, fromArg],
      [toId, toType, toObject, toArg],
    ]) {
      if (!object && validateExistence) {
        throw new Error(
          `input.${arg}: Can not find ${typeName} object with given ID: ` +
          toReindexID(oId)
        );
      }

      checkPermission(
        typeName,
        'update',
        object,
        context
      );
    }

    const { from, to } = await db[operation]({
      fromType,
      fromId,
      fromField,
      toType,
      toId,
      toField,
    });

    const output = {};
    for (const [typeName, object] of [
      [fromType, from],
      [toType, to],
    ]) {
      const formattedResult = formatMutationResult(
        clientMutationId,
        typeName,
        object,
      );

      checkAndEnqueueHooks(
        db,
        context.rootValue.hooks,
        typeName,
        'afterUpdate',
        formattedResult,
      );

      Object.assign(output, formattedResult);
    }

    return output;
  };
}
