import { mapValues } from 'lodash';

import {
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLList,
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
  let parentType;

  if (fieldType instanceof GraphQLList ||
      fieldType instanceof GraphQLNonNull) {
    parentType = fieldType;
    fieldType = parentType.ofType;
  }

  if (!(fieldType instanceof GraphQLInputObjectType ||
        fieldType instanceof GraphQLScalarType ||
        fieldType instanceof GraphQLEnumType)) {
    fieldType = fieldType.getInterfaces().includes(interfaces.Node) ?
      ReindexID :
      getTypeSet(fieldType.name).getInputObject(getTypeSet, interfaces);
  }

  if (parentType) {
    if (parentType instanceof GraphQLNonNull && !preserveNonNull) {
      return {
        type: fieldType,
      };
    } else {
      return {
        type: new parentType.constructor(fieldType),
      };
    }
  } else {
    return {
      type: fieldType,
    };
  }
}
