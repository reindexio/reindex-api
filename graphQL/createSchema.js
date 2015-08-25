import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLEnumType,
} from 'graphql';
import { Map } from 'immutable';

import TypeSet from './TypeSet';

import DateTime from './builtins/DateTime';
import ReindexID from './builtins/ReindexID';
import createInterfaces from './builtins/createInterfaces';
import createCommonTypes from './builtins/createCommonTypes';
import CommonQueryFieldCreators from './builtins/CommonQueryFieldCreators';
import CommonMutationFieldCreators
  from './builtins/CommonMutationFieldCreators';
import TypeQueryFieldCreators from './builtins/TypeQueryFieldCreators';
import TypeMutationFieldCreators from './builtins/TypeMutationFieldCreators';
import createCommonRootFields from './createCommonRootFields';
import createRootFieldsForTypes from './createRootFieldsForTypes';
import {
  createConnection,
  createConnectionArguments,
  createConnectionSourceResolve,
  createConnectionTargetResolve,
 } from './connections';

/**
 * Given map of built-in types and database metadata about custom data,
 * construct GraphQL schema for them.
 */
export default function createSchema(dbMetadata) {
  const interfaces = createInterfaces();
  let typeSets;

  function getTypeSet(name) {
    return typeSets.get(name);
  }

  typeSets = createCommonTypes(interfaces, getTypeSet)
    .merge(dbMetadata.toKeyedSeq().mapEntries(([, typeMetadata]) => {
      const kind = typeMetadata.get('kind');
      if (kind === 'OBJECT') {
        const type = createObjectType(typeMetadata, getTypeSet, interfaces);
        return [
          typeMetadata.get('name'),
          new TypeSet({ type }),
        ];
      }
    }))
    .map((typeSet) => {
      if (typeSet.type.getInterfaces().includes(interfaces.Node)) {
        typeSet = typeSet.set(
          'connection',
          createConnection(typeSet, interfaces),
        );
        typeSet = typeSet.set(
          'payload',
          createPayload(typeSet, interfaces)
        );
      }
      return typeSet;
    });

  // This has to happen separately, because it forces field thunks and needs
  // typesets to contain all types required.
  typeSets = typeSets.map((typeSet) => {
    typeSet = typeSet.set(
      'inputObject',
      createInputObjectType(typeSet, getTypeSet, interfaces),
    );
    return typeSet;
  });

  const queryFields = createCommonRootFields(
    CommonQueryFieldCreators,
    typeSets,
    interfaces
  ).merge(createRootFieldsForTypes(
    TypeQueryFieldCreators,
    typeSets,
    interfaces
  ));

  const mutationFields = createCommonRootFields(
    CommonMutationFieldCreators,
    typeSets,
    interfaces
  ).merge(createRootFieldsForTypes(
    TypeMutationFieldCreators,
    typeSets,
    interfaces
  ));

  const query = new GraphQLObjectType({
    name: 'ReindexQueryRoot',
    fields: queryFields.toObject(),
  });

  const mutation = new GraphQLObjectType({
    name: 'ReindexMutationRoot',
    fields: mutationFields.toObject(),
  });

  return new GraphQLSchema({
    query,
    mutation,
  });
}

function createObjectType(type, getTypeSet, interfaces) {
  const config = {
    name: type.get('name'),
    description: type.get('description', null),
    fields: () => type
      .get('fields')
      .toKeyedSeq()
      .mapEntries(([, field]) => [
        field.get('name'),
        createField(field, getTypeSet, interfaces),
      ])
      .toObject(),
    interfaces: [...type.get('interfaces').map((name) => interfaces[name])],
  };
  if (config.interfaces.includes(interfaces.Node)) {
    config.isTypeOf = (value) => value.id.type === type.get('name');
  }

  return new GraphQLObjectType(config);
}

const PRIMITIVE_TYPE_MAP = Map({
  ID: ReindexID,
  String: GraphQLString,
  Int: GraphQLInt,
  Float: GraphQLFloat,
  Boolean: GraphQLBoolean,
  DateTime,
});

function createField(field, getTypeSet, interfaces) {
  const fieldName = field.get('name');
  const fieldType = field.get('type');

  let type;
  let resolve;
  let argDef = {};
  if (fieldType === 'Connection') {
    const ofType = field.get('ofType');
    const reverseName = field.get('reverseName');
    type = getTypeSet(ofType).connection;
    argDef = createConnectionArguments();
    resolve = createConnectionSourceResolve(ofType, reverseName);
  } else if (fieldType === 'List') {
    const innerType = PRIMITIVE_TYPE_MAP.get(field.get('ofType')) ||
      getTypeSet(field.get('ofType')).type;
    type = new GraphQLList(innerType);
  } else if (PRIMITIVE_TYPE_MAP.has(fieldType)) {
    type = PRIMITIVE_TYPE_MAP.get(fieldType);
  } else {
    type = getTypeSet(fieldType).type;
    if (type.getInterfaces().includes(interfaces.Node)) {
      resolve = createConnectionTargetResolve(type.name, fieldName);
    }
  }

  if (field.get('nonNull')) {
    type = new GraphQLNonNull(type);
  }

  return {
    name: fieldName,
    type,
    args: argDef,
    resolve,
    deprecationReason: field.get('deprecationReason', null),
    description: field.get('description', null),
  };
}

function createInputObjectType(
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

function createPayload({ type }) {
  return new GraphQLObjectType({
    name: '_' + type.name + 'Payload',
    fields: {
      clientMutationId: {
        type: GraphQLString,
      },
      [type.name]: {
        type,
      },
    },
  });
}
