import {
  GraphQLInputObjectType,
} from 'graphql';
import createInputObjectFields from './createInputObjectFields';
import getGeneratedTypeName from './utilities/getGeneratedTypeName';

export default function createInputObjectType(
  typeSet, getTypeSet, interfaces, fields
) {
  return new GraphQLInputObjectType({
    name: getGeneratedTypeName(typeSet.type.name, 'Input'),
    fields: () => createInputObjectFields(fields, true, getTypeSet, interfaces),
  });
}
