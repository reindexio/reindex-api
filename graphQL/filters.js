import { GraphQLEnumType } from 'graphql';
import { GraphQLError } from 'graphql/error/GraphQLError';

export function processFilters(types, typeName, filters) {
  const processedFilters = [];
  for (const filter of filters) {
    const field = getFilterField(types, typeName, filter);
    let fieldType = field.type;

    const op = filter.op;

    let allowedOps = TYPE_TO_ALLOWED_OP[fieldType];
    if (!allowedOps) {
      fieldType = 'Node';
      allowedOps = TYPE_TO_ALLOWED_OP.Node;
    }

    if (!allowedOps.includes(op)) {
      throw new GraphQLError(
        `Invalid filter op \`${op}\` ` +
        `for field ${filter.field} of type \`${fieldType}\`. ` +
        `Allowed op values are: ${allowedOps.join(', ')}.`
      );
    }

    if (fieldType === 'List') {
      fieldType = field.ofType;
    }

    let valueKey = TYPE_TO_VALUE[fieldType];
    if (op === 'NULL' || op === 'NOTNULL') {
      valueKey = null;
    }

    const value = valueKey && filter[valueKey];

    const valueThere = !valueKey || value;
    const noExtraValues = VALUES.every((key) =>
      (key === valueKey) || !filter[key]
    );

    if (!valueThere || (!noExtraValues && valueKey)) {
      throw new GraphQLError(
        `Invalid filter value for field \`${filter.field}\` of type ` +
        `\`${fieldType}\` with op \`${op}\`. ` +
        `Expected only \`${valueKey}\` to be non-null.`
      );
    } else if (!noExtraValues && !valueKey) {
      throw new GraphQLError(
        `Invalid filter value for field \`${filter.field}\` of type ` +
        `\`${fieldType}\` with op \`${op}\`. ` +
        `Expected no values to be present.`
      );
    }

    processedFilters.push({
      op: filter.op,
      field: filter.field.split('__').join('.'),
      value,
    });
  }

  return processedFilters;
}

function getFilterField(types, type, filter) {
  let fields = type.fields;
  let fieldChain = filter.field;
  if (fieldChain.includes('__')) {
    fieldChain = fieldChain.split(/__/);
  } else {
    fieldChain = [fieldChain];
  }
  let field = fields[fieldChain.shift()];
  while (fieldChain.length > 0) {
    type = types[field.type];
    fields = type.fields;
    field = fields[fieldChain.shift()];
  }
  return field;
}

const VALUES = [
  'valueString',
  'valueBoolean',
  'valueFloat',
  'valueDateTime',
  'valueBoolean',
  'valueID',
];

const TYPE_TO_VALUE = {
  String: 'valueString',
  Int: 'valueBoolean',
  Float: 'valueFloat',
  DateTime: 'valueDateTime',
  Boolean: 'valueBoolean',
  Connection: 'valueID',
  Node: 'valueID',
};

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

export const FilterOperation = new GraphQLEnumType({
  name: 'ReindexFilterOperation',
  description:
`Type of the filter.

Possible value:

* \`EQ\` - equal (case sensitive for strings)
  Valid types: String, Int, Float, Boolean, DateTime, Node
* \`NEQ\` - not-equal (case sensitive for strings)
  Valid types: String, Int, Float, Boolean, DateTime, Node
* \`LT\` - less than
  Valid types: Int, Float, DateTime
* \`LTE\` - less than equal
  Valid types: Int, Float, DateTime
* \`GT\` - greater than
  Valid types: Int, Float, DateTime
* \`GTE\` - greater than equal
  Valid types: Int, Float, DateTime
* \`NULL\` - value is null
  Valid types: String, Int, Float, Boolean, DateTime
* \`NOTNULL\` - value is not null
  Valid types: String, Int, Float, Boolean, DateTime
* \`IN\` - value is inside list or connection field
  Valid types: Connection, List
* \`NIN\` - value is not inside list or connection field
  Valid types: Connection, List
`,
  values: {
    EQ: {
      value: 'EQ',
    },
    NEQ: {
      value: 'NEQ',
    },
    LT: {
      value: 'LT',
    },
    LTE: {
      value: 'LTE',
    },
    GT: {
      value: 'GT',
    },
    GTE: {
      value: 'GTE',
    },
    NULL: {
      value: 'NULL',
    },
    NOTNULL: {
      value: 'NOTNULL',
    },
    IN: {
      value: 'IN',
    },
    NIN: {
      value: 'NIN',
    },
  },
});
