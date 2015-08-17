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
import {Map, List, fromJS} from 'immutable';

import TypeSet from './TypeSet';
import {getByID} from '../db/queries/simple';
import {getConnectionQueries} from '../db/queries/connections';
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
  createConnectionArguments
} from './connections';

/**
 * Given map of built-in types and database metadata about custom data,
 * construct GraphQL schema for them.
 */
export default function createSchema(dbMetadata) {
  const interfaces = createInterfaces();
  let typeSets = createCommonTypes(interfaces);

  function getTypeSet(name) {
    return typeSets.get(name);
  }

  dbMetadata.forEach((typeMetadata) => {
    if (typeMetadata.get('kind') === 'OBJECT') {
      const type = createObjectType(typeMetadata, getTypeSet, interfaces);
      let typeSet = new TypeSet({ type });
      if (type.getInterfaces().includes(interfaces.ReindexNode)) {
        typeSet = typeSet.set(
          'connection',
          createConnection(typeSet, interfaces),
        );
      }
      typeSets = typeSets.set(typeMetadata.get('name'), typeSet);
    }
  });

  typeSets = typeSets.map((typeSet) => {
    typeSet = typeSet.set(
      'inputObject',
      createInputObjectType(typeSet, getTypeSet, interfaces),
    );
    if (typeSet.type.getInterfaces().includes(interfaces.ReindexNode)) {
      typeSet = typeSet.set(
        'mutation',
        createMutation(typeSet, interfaces)
      );
      if (!typeSet.connection) {
        typeSet = typeSet.set(
          'connection',
          createConnection(typeSet, interfaces)
        );
      }
    }
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
  return new GraphQLObjectType({
    name: type.get('name'),
    fields: () => type
      .get('fields')
      .toKeyedSeq()
      .mapEntries(([, field]) => [
        field.get('name'),
        createField(field, getTypeSet, interfaces),
      ])
      .toObject(),
    interfaces: [...type.get('interfaces').map((name) => interfaces[name])],
    isTypeOf(value) {
      return value.id.type === type.get('name');
    },
  });
}

const PRIMITIVE_TYPE_MAP = Map({
  id: ReindexID,
  string: GraphQLString,
  integer: GraphQLInt,
  number: GraphQLFloat,
  boolean: GraphQLBoolean,
  datetime: DateTime,
});

function createField(field, getTypeSet, interfaces) {
  const fieldName = field.get('name');
  const fieldType = field.get('type');

  let type;
  let resolve;
  let argDef = Map();
  if (fieldType === 'connection') {
    const ofType = field.get('ofType');
    const reverseName = field.get('reverseName');
    type = getTypeSet(ofType).connection;
    argDef = createConnectionArguments();
    resolve = (parent, args, {conn, indexes}) => {
      return getConnectionQueries(
        conn,
        ofType,
        indexes.get(ofType),
        {
          keyPrefixFields: fromJS([[reverseName, 'value']]),
          keyPrefix: List.of(parent.id.value),
        },
        args
      );
    };
  } else if (fieldType === 'list') {
    const innerType = PRIMITIVE_TYPE_MAP.get(field.get('ofType')) ||
      getTypeSet(field.get('ofType')).type;
    type = new GraphQLList(innerType);
  } else if (PRIMITIVE_TYPE_MAP.has(fieldType)) {
    type = PRIMITIVE_TYPE_MAP.get(fieldType);
  } else {
    type = getTypeSet(fieldType).type;
    if (type.getInterfaces().includes(interfaces.ReindexNode)) {
      resolve = (parent, args, {conn}) => getByID(conn, parent[fieldName]);
    }
  }

  if (field.get('isRequired')) {
    type = new GraphQLNonNull(type);
  }

  return {
    name: fieldName,
    type,
    args: argDef.toObject(),
    resolve,
    isDeprecated: field.get('isDeprecated') || false,
  };
}

function createInputObjectType(
  {type},
  getTypeSet,
  {ReindexNode, ReindexConnection}
) {
  return new GraphQLInputObjectType({
    name: '_' + type.name + 'InputObject',
    fields: () => Map(type.getFields())
      .filter((field) => {
        return (
          field.type !== ReindexID &&
          (!field.type.getInterfaces ||
           !field.type.getInterfaces().includes(ReindexConnection))
        );
      })
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
          fieldType = fieldType.getInterfaces().includes(ReindexNode) ?
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
}

function createMutation({type}, interfaces) {
  return new GraphQLObjectType({
    name: '_' + type.name + 'Mutation',
    fields: {
      clientMutationId: {
        type: GraphQLString,
      },
      [type.name]: {
        type,
      },
    },
    interfaces: [
      interfaces.ReindexMutation,
    ],
  });
}
