import { chain, capitalize, camelCase, isEqual } from 'lodash';
import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
} from 'graphql';

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

  let fromArg;
  let toArg;
  let name;
  let fromChangedName;
  let toChangedName;

  if (toTypeName === fromTypeName && field.name === reverseName) {
    fromArg = camelCase(`${fromTypeName} 1 id`);
    fromChangedName = camelCase(`changed ${fromTypeName} 1`);
    toArg = camelCase(`${toTypeName} 2 id`);
    toChangedName = camelCase(`changed ${toTypeName} 2`);
    name = capitalize(camelCase(`${fromTypeName} ${field.name}`));
  } else if (toTypeName === fromTypeName) {
    fromArg = camelCase(`${reverseName} id`);
    fromChangedName = camelCase(`changed ${reverseName} ${fromTypeName}`);
    toArg = camelCase(`${field.name} id`);
    toChangedName = camelCase(`changed ${field.name} ${toTypeName}`);
    name = capitalize(camelCase(`${fromTypeName} ${field.name}`));
  } else {
    fromArg = camelCase(`${fromTypeName} id`);
    fromChangedName = `changed${fromTypeName}`;
    toArg = camelCase(`${toTypeName} id`);
    toChangedName = `changed${toTypeName}`;
    name = capitalize(camelCase(`${fromTypeName} ${toTypeName} ${field.name}`));
  }

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
      [fromChangedName]: {
        type: fromType,
        description: `The ${fromTypeName} object.`,
      },
      [`${fromChangedName}Edge`]: {
        type: fromEdge,
        description: `A connection edge containing the ${fromTypeName} object.`,
      },
      [toChangedName]: {
        type: toType,
        description: `The ${toTypeName} object.`,
      },
      [`${toChangedName}Edge`]: {
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
      fromChangedName,
      toType: toTypeName,
      toField: field.name,
      toArg,
      toChangedName,
    }),
    createRemoveMutation(inputType, payload, {
      fromType: fromTypeName,
      fromField: reverseName,
      fromArg,
      fromChangedName,
      toType: toTypeName,
      toField: field.name,
      toArg,
      toChangedName,
    }),
  ];
}

function createAddMutation(inputType, payload, options) {
  const { fromType, toType, toField } = options;
  const name = camelCase(`add ${fromType} to ${toType} ${toField}`);

  return {
    name,
    type: payload,
    description:
`Add \`${fromType}\` object to \`${toField}\` of \`${toType}\` object.`,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    resolve: createResolveFunction('addToConnection', true, options),
  };
}

function createRemoveMutation(inputType, payload, options) {
  const { fromType, toType, toField } = options;
  const name = camelCase(
    `remove ${fromType} from ${toType} ${toField}`
  );

  return {
    name,
    type: payload,
    description:
`Remove \`${fromType}\` object from \`${toField}\` of \`${toType}\` object.`,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    resolve: createResolveFunction('removeFromConnection', true, options),
  };
}

function createResolveFunction(
  operation,
  validateExistence,
  {
    fromType,
    fromField,
    fromArg,
    fromChangedName,
    toType,
    toField,
    toArg,
    toChangedName,
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
    for (const [typeName, object, changedName] of [
      [fromType, from, fromChangedName],
      [toType, to, toChangedName],
    ]) {
      const formattedResult = formatMutationResult(
        clientMutationId,
        typeName,
        object,
        changedName,
      );

      Object.assign(output, formattedResult);
    }

    checkAndEnqueueHooks(
      db,
      context.rootValue.hooks,
      fromType,
      'afterUpdate',
      clientMutationId,
      from,
    );

    if (!isEqual(fromId, toId)) {
      checkAndEnqueueHooks(
        db,
        context.rootValue.hooks,
        toType,
        'afterUpdate',
        clientMutationId,
        to,
      );
    }

    return output;
  };
}
