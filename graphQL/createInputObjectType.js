import {
  GraphQLInputObjectType,
} from 'graphql';

import createInputObjectFields from './createInputObjectFields';
import { getInputObjectTypeName } from './derivedNames';

export default function createInputObjectType(
  typeSet,
  getTypeSet,
  interfaces,
  fields,
) {
  const { type } = typeSet;
  return new GraphQLInputObjectType({
    name: getInputObjectTypeName(type.name),
    description: `The input object for mutations of type \`${type.name}\`.`,
    fields: () => createInputObjectFields(fields, true, getTypeSet, interfaces),
  });
}
