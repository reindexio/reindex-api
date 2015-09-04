import { Map } from 'immutable';
import {
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLEnumType,
} from 'graphql';
import ReindexID from './builtins/ReindexID';

export default function createInputObjectType(
  { type },
  getTypeSet,
  { Node }
) {
  const filteredFields = Map(type.getFields())
    .filter((field) => {
      const fieldType = field.type.ofType ? field.type.ofType : field.type;
      return (
        fieldType !== ReindexID &&
        !fieldType.name.endsWith('Connection')
      );
    });
  if (filteredFields.count() > 0) {
    return new GraphQLInputObjectType({
      name: '_' + type.name + 'Input',
      fields: () => filteredFields
      .map((field) => {
        let fieldType = field.type;
        let parentType;

        if (fieldType instanceof GraphQLList ||
            fieldType instanceof GraphQLNonNull) {
          parentType = fieldType;
          fieldType = parentType.ofType;
        }

        if (fieldType instanceof GraphQLInputObjectType ||
            fieldType instanceof GraphQLScalarType ||
            fieldType instanceof GraphQLEnumType) {
          return {
            type: field.type,
          };
        } else {
          fieldType = fieldType.getInterfaces().includes(Node) ?
            ReindexID :
            getTypeSet(fieldType.name).inputObject;
          if (parentType) {
            return {
              type: new parentType.constructor(fieldType),
            };
          } else {
            return {
              type: fieldType,
            };
          }
        }
      })
      .toObject(),
    });
  } else {
    return null;
  }
}
