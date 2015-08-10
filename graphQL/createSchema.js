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
} from 'graphql';
import {Map} from 'immutable';

import TypeSet from './TypeSet';
import {
  getByID,
  getAllByIndexQuery,
  processConnectionQuery,
} from '../db/queries';
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
  let typeSets = createCommonTypes(interfaces).map((typeSet) => (
    typeSet.merge(Map({
      connection: createConnection(typeSet, interfaces),
      inputObject: createInputObject(typeSet, interfaces),
      mutation: createMutation(typeSet, interfaces),
    }))
  ));

  dbMetadata.forEach((typeMetadata) => {
    const typeName = typeMetadata.get('name');
    const type = createType(typeMetadata, (name) => {
      return typeSets.get(name);
    }, interfaces);
    const typeSet = new TypeSet({type});
    const connection = createConnection(typeSet, interfaces);
    typeSets = typeSets.set(typeName, typeSet.set('connection', connection));
  });

  typeSets = typeSets.map((typeSet) => {
    return typeSet.merge({
      inputObject: createInputObject(typeSet, interfaces),
      mutation: createMutation(typeSet, interfaces),
    });
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
    name: 'ReindexQuery',
    fields: queryFields.toObject(),
  });

  const mutation = new GraphQLObjectType({
    name: 'ReindexMutation',
    fields: mutationFields.toObject(),
  });

  return new GraphQLSchema({
    query,
    mutation,
  });
}

function createType(type, getTypeSet, {Node}) {
  return new GraphQLObjectType({
    name: type.get('name'),
    fields: () => type
      .get('fields')
      .toKeyedSeq()
      .mapEntries(([, field]) => [
        field.get('name'),
        createField(field, getTypeSet),
      ])
      .toObject(),
    interfaces: [Node],
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

function createField(field, getTypeSet) {
  const fieldName = field.get('name');
  const fieldType = field.get('type');
  let type;
  let resolve;
  let argDef = Map();
  if (fieldType === 'connection' && field.has('target')) {
    const target = field.get('target');
    type = getTypeSet(target).connection;
    argDef = createConnectionArguments();
    resolve = (parent, args) => {
      return processConnectionQuery(
        getAllByIndexQuery(
          target,
          parent.id.value,
          field.get('reverseName')
        ),
        args
      );
    };
  } else if (PRIMITIVE_TYPE_MAP.has(fieldType)) {
    type = PRIMITIVE_TYPE_MAP.get(fieldType);
  } else {
    type = getTypeSet(fieldType).type;
    resolve = (parent, args, {conn}) => {
      return getByID(conn, parent[fieldName]);
    };
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

function createInputObject({type}, {Connection}) {
  return new GraphQLInputObjectType({
    name: '_' + type.name + 'InputObject',
    fields: Map(type.getFields())
      .filter((field, name) => {
        return (
          name !== 'id' &&
          (!field.type.getInterfaces ||
           !field.type.getInterfaces().includes(Connection))
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
            fieldType instanceof GraphQLScalarType) {
          return {
            type: field.type,
          };
        } else {
          if (parentType) {
            return {
              type: new parentType.constructor(ReindexID),
            };
          } else {
            return {
              type: ReindexID,
            };
          }
        }
      })
      .toObject(),
  });
}

function createMutation({type}, {Mutation}) {
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
    interfaces: [Mutation],
  });
}
