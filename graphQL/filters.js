import { values } from 'lodash';
import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';

import ScalarTypes from './builtins/ScalarTypes';
import ReindexID from './builtins/ReindexID';
import { getFilterName } from './derivedNames';

export function processFilters(typeSet, args) {
  const filterArgs = typeSet.getFilterArgs();
  const filters = [];
  for (const filterArg of values(filterArgs)) {
    const argValue = args[filterArg.name] || {};
    for (const op in argValue) {
      const value = argValue[op];
      filters.push({
        op,
        value,
        field: filterArg.field.replace('__', '.'),
      });
    }
  }
  return filters;
}

const TYPE_TO_ALLOWED_OP = {
  String: ['eq', 'neq', 'isNull'],
  Boolean: ['eq', 'neq', 'isNull'],
  Int: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull'],
  Float: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull'],
  DateTime: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull'],
  List: ['includes', 'excludes', 'isNull', 'eq', 'neq'],
  Connection: ['includes', 'excludes'],
  Node: ['eq', 'neq', 'isNull'],
};

const OP_DOCS = {
  eq: `equal (case sensitive for strings)`,
  neq: `not-equal (case sensitive for strings)`,
  lt: `less than`,
  lte: `less than equal`,
  gt: `greater than`,
  gte: `greater than equal`,
  isNull: `value is null if \`true\`, is not null if \`false\``,
  includes: `value is inside list or connection field`,
  excludes: `value is not inside list or connection field`,
};

export function createFilterArgs(typeSet) {
  const reservedArgs = [
    'orderBy',
    'first',
    'last',
    'before',
    'after',
  ];
  const args = {};
  for (const field of typeSet.getFilters() || []) {
    let filterName = field.name;
    while (args[filterName] || reservedArgs.includes(filterName)) {
      filterName = `_${filterName}`;
    }
    args[filterName] = createFilterArg(typeSet.type, field, filterName);
  }
  return args;
}

function createFilterArg(type, field, filterName) {
  const possibleOperations = (
    TYPE_TO_ALLOWED_OP[field.type] ||
    TYPE_TO_ALLOWED_OP.Node
  );
  const fields = possibleOperations
    .map((operation) => ({
      [operation]: {
        type: (
          operation === 'isNull' ?
          GraphQLBoolean :
          fieldToFilterType(field, operation)
        ),
        description: OP_DOCS[operation],
      },
    }))
    .reduce((acc, next) => ({
      ...acc,
      ...next,
    }));
  const filterType = new GraphQLInputObjectType({
    name: getFilterName(type.name, field.name),
    description:
`Filter by the \`${field.name}\``,
    fields: {
      ...fields,
    },
  });
  return {
    name: filterName,
    field: field.name,
    type: filterType,
    description: `Filter the connection based on \`${field.name}\``,
  };
}

function fieldToFilterType(field, operation) {
  if (ScalarTypes[field.type]) {
    return ScalarTypes[field.type];
  } else if (field.type === 'Connection' || field.reverseName) {
    return ReindexID;
  } else if (field.type === 'List' &&
             operation !== 'eq' &&
             operation !== 'neq') {
    return ScalarTypes[field.ofType];
  } else if (field.type === 'List') {
    return new GraphQLList(ScalarTypes[field.ofType]);
  }
}
