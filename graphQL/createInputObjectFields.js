import { mapValues } from 'lodash';

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
  getTypeSet,
  interfaces
) {
  return mapValues(fields, (field) => convertInputObjectField(
    field, preserveNonNull, getTypeSet, interfaces
  ));
}

function convertInputObjectField(
  field,
  preserveNonNull,
  getTypeSet,
  interfaces,
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
    fieldType = fieldType.getInterfaces().includes(interfaces.Node) ?
      ReindexID :
      getTypeSet(fieldType.name).getInputObject(getTypeSet, interfaces);
  }

  fieldType = wrappers.reduce((type, Wrapper) => {
    if (Wrapper === GraphQLNonNull && !preserveNonNull) {
      return type;
    }
    return new Wrapper(type);
  }, fieldType);

  return { type: fieldType };
}
