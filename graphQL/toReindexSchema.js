import { values } from 'lodash';
import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql';

// Convert graphql-js schema to Reindex schema
export default function toReindexSchema(schema) {
  const types = values(schema.getTypeMap());
  return types
    .filter((type) => (
      type instanceof GraphQLObjectType &&
      type.name !== 'ReindexQueryRoot' &&
      type.name !== 'ReindexMutationRoot' &&
      type.name !== 'ReindexViewer' &&
      !type.name.startsWith('_') &&
      !type.name.endsWith('Connection') &&
      !type.name.endsWith('Edge') &&
      !type.name.endsWith('Payload')
    ))
    .map(toReindexType);
}

export function toReindexType(type) {
  return {
    name: type.name,
    interfaces: type.getInterfaces().map((interFace) => interFace.name),
    kind: 'OBJECT',
    fields: values(type.getFields()).map(toReindexField),
  };
}

function toReindexField(field) {
  const type = field.type;
  let typeName;
  let ofType;
  let nonNull = false;
  if (type instanceof GraphQLNonNull) {
    typeName = type.ofType.name;
    nonNull = true;
  } else if (type instanceof GraphQLList) {
    typeName = 'List';
    ofType = type.ofType.name;
  } else if (type.name.endsWith('Connection')) {
    typeName = 'Connection';
    ofType = type.name.replace(/Connection/, '').replace(/_/, '');
  } else {
    typeName = type.name;
  }

  const metadata = field.metadata || {};

  return {
    name: field.name,
    type: typeName,
    description: field.description,
    deprecationReason: field.deprecationReason,
    ofType,
    nonNull,
    builtin: metadata.builtin,
    reverseName: metadata.reverseName,
    grantPermissions: metadata.grantPermissions,
    defaultOrdreing: metadata.defaultOrdering,
    unique: metadata.unique,
    orderable: metadata.orderable,
  };
}
