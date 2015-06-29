import {Map} from 'immutable';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLList,
  GraphQLInputObjectType,
} from 'graphql';
import TypeSet from './TypeSet';
import {getById, getAllByIndex, processConnectionQuery} from '../db/queries';
import DateTime from './builtins/DateTime';
import createInterfaces from './builtins/createInterfaces';
import createCommonTypes from './builtins/createCommonTypes';
import CommonQueryFields from './builtins/CommonQueryFields';
import CommonMutationFields from './builtins/CommonMutationFields';
import TypeQueryFieldCreators from './builtins/TypeQueryFieldCreators';
import TypeMutationFieldCreators from './builtins/TypeMutationFieldCreators';
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

  const queryFields = CommonQueryFields.merge(
    createRootFieldsForTypes(TypeQueryFieldCreators, typeSets)
  );

  const mutationFields = CommonMutationFields.merge(
    createRootFieldsForTypes(TypeMutationFieldCreators, typeSets)
  );

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

function createType(type, getTypeSet) {
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
  });
}

const PRIMITIVE_TYPE_MAP = Map({
  id: GraphQLID,
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
    resolve = (parent, args, {dbContext}) => {
      return processConnectionQuery(
        getAllByIndex(dbContext, target, parent.id, field.get('reverseName')),
        args
      );
    };
  } else if (PRIMITIVE_TYPE_MAP.has(fieldType)) {
    type = PRIMITIVE_TYPE_MAP.get(fieldType);
  } else {
    type = getTypeSet(fieldType).type;
    resolve = (parent, args, {dbContext}) => {
      return getById(dbContext, fieldType, parent[fieldName])
        .run(dbContext.conn);
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
              type: new parentType.constructor(GraphQLString),
            };
          } else {
            return {
              type: GraphQLString,
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
        type: GraphQLID,
      },
      [type.name]: {
        type,
      },
    },
    interfaces: [Mutation],
  });
}
