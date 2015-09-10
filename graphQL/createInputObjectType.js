import {
  GraphQLInputObjectType,
} from 'graphql';
import createInputObjectFields from './createInputObjectFields';

export default function createInputObjectType(
  typeSet, getTypeSet, interfaces, fields
) {
  return new GraphQLInputObjectType({
    name: '_' + typeSet.type.name + 'Input',
    fields: () => createInputObjectFields(fields, true, getTypeSet, interfaces),
  });
}
