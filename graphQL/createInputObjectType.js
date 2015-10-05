import {
  GraphQLInputObjectType,
} from 'graphql';
import createInputObjectFields from './createInputObjectFields';
import getGeneratedTypeName from './utilities/getGeneratedTypeName';

export default function createInputObjectType(
  typeSet,
  getTypeSet,
  interfaces,
  fields,
) {
  const { type } = typeSet;
  return new GraphQLInputObjectType({
    name: getGeneratedTypeName(type.name, 'Input'),
    description: 'The input object for mutations of type `${type.name}`.',
    fields: () => createInputObjectFields(fields, true, getTypeSet, interfaces),
  });
}
