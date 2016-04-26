import { chain, values } from 'lodash';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { GraphQLError } from 'graphql/error/GraphQLError';

import ScalarTypes from './builtins/ScalarTypes';
import ReindexID from './builtins/ReindexID';
import { getFilterOperationName, getFilterName } from './derivedNames';

export function processFilters(typeSet, args) {
  const filterArgs = typeSet.getFilterArgs();
  const filters = [];
  for (const filterArg of values(filterArgs)) {
    const argValue = args[filterArg.name];
    if (argValue) {
      for (const argI in argValue) {
        const arg = argValue[argI];
        if ((arg.op === 'NULL' || arg.op === 'NOTNULL') && arg.value) {
          throw new GraphQLError(
            `Invalid argument \`${filterArg.name}\`. In element #${argI}: ` +
            'expected \`value\` to be null.'
          );
        } else if ((arg.op !== 'NULL' && arg.op !== 'NOTNULL') && !arg.value) {
          throw new GraphQLError(
            `Invalid argument \`${filterArg.name}\`. In element #${argI}: ` +
            'expected \`value\` to be not null.'
          );
        }
        filters.push({
          ...arg,
          field: filterArg.field.replace('__', '.'),
        });
      }
    }
  }
  return filters;
}

const TYPE_TO_ALLOWED_OP = {
  String: ['EQ', 'NEQ', 'NULL', 'NOTNULL'],
  Boolean: ['EQ', 'NEQ', 'NULL', 'NOTNULL'],
  Int: ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE', 'NULL', 'NOTNULL'],
  Float: ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE', 'NULL', 'NOTNULL'],
  DateTime: ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE', 'NULL', 'NOTNULL'],
  List: ['IN', 'NIN', 'NULL', 'NULL'],
  Connection: ['IN', 'NIN'],
  Node: ['EQ', 'NEQ', 'NULL', 'NOTNULL'],
};

const OP_DOCS = {
  EQ: `\`EQ\` - equal (case sensitive for strings)`,
  NEQ: `\`NEQ\` - not-equal (case sensitive for strings)`,
  LT: `\`LT\` - less than`,
  LTE: `\`LTE\` - less than equal`,
  GT: `\`GT\` - greater than`,
  GTE: `\`GTE\` - greater than equal`,
  NULL: `\`NULL\` - value is null`,
  NOTNULL: `\`NOTNULL\` - value is not null`,
  IN: `\`IN\` - value is inside list or connection field`,
  NIN: `\`NIN\` - value is not inside list or connection field`,
};

export function createFilterArgs(typeSet) {
  const reservedArgs = [
    'orderBy',
    'first',
    'last',
    'before',
    'after',
    'pageInfo',
  ];
  const args = {};
  for (const field of typeSet.getFilters() || []) {
    let filterName = field.name;
    while (args[filterName] || reservedArgs.includes[filterName]) {
      filterName = `${filterName}Filter`;
    }
    args[filterName] = createFilterArg(typeSet.type, field, filterName);
  }
  return args;
}

function createFilterArg(type, field, filterName) {
  const filterType = new GraphQLInputObjectType({
    name: getFilterName(type.name, field.name),
    description:
`Filter by the \`${field.name}\``,
    fields: {
      op: {
        type: new GraphQLNonNull(createFilterOperation(type, field)),
      },
      value: {
        type: fieldToFilterType(field),
      },
    },
  });
  return {
    name: filterName,
    field: field.name,
    type: new GraphQLList(filterType),
    description: `Filter the connection based on \`${field.name}\``,
  };
}

function createFilterOperation(type, field) {
  const possibleOperations = (
    TYPE_TO_ALLOWED_OP[field.type] ||
    TYPE_TO_ALLOWED_OP.Node
  );
  const docs = possibleOperations
    .map((op) => `* ${OP_DOCS[op]}`)
    .join('\n');
  return new GraphQLEnumType({
    name: getFilterOperationName(type.name, field.name),
    desciption: `
      Operation of the filter.

      Possible values:

      ${docs}
    `,
    values: chain(possibleOperations)
      .map((op) => ({ value: op }))
      .indexBy((op) => op.value)
      .value(),
  });
}

function fieldToFilterType(field) {
  if (ScalarTypes[field.type]) {
    return ScalarTypes[field.type];
  } else if (field.type === 'Connection' || field.reverseName) {
    return ReindexID;
  } else if (field.type === 'List') {
    return ScalarTypes[field.ofType];
  }
}
