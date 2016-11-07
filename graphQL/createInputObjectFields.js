import { chain } from 'lodash';

import {
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLEnumType,
} from 'graphql';
import ReindexID from './builtins/ReindexID';

export default function createInputObjectFields(
  fields,
  preserveNonNull,
  typeRegistry,
) {
  return chain(fields)
    .pick((field) => !(field.metadata && field.metadata.computed))
    .mapValues((field) =>
      convertInputObjectField(field, preserveNonNull, typeRegistry)
    )
    .value();
}

function convertInputObjectField(
  field,
  preserveNonNull,
  typeRegistry,
) {
  let fieldType = field.type;
  const wrappers = [];

  while (fieldType.ofType) {
    wrappers.unshift(fieldType.constructor);
    fieldType = fieldType.ofType;
  }

  if (!(fieldType instanceof GraphQLInputObjectType ||
        fieldType instanceof GraphQLScalarType ||
        fieldType instanceof GraphQLEnumType)) {
    if (fieldType.getInterfaces().includes(typeRegistry.getInterface('Node'))) {
      fieldType = ReindexID;
    } else {
      fieldType = typeRegistry
        .getTypeSet(fieldType.name)
        .getInputObject(typeRegistry);
    }
  }

  fieldType = wrappers.reduce((type, Wrapper) => {
    if (Wrapper === GraphQLNonNull && !preserveNonNull) {
      return type;
    }
    return new Wrapper(type);
  }, fieldType);

  return { type: fieldType };
}
