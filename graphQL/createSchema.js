import {Map, Record} from 'immutable';
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
import {getById, getAllByIndex, processConnectionQuery} from '../db/queries';
import {DateTime, createInterfaces} from './builtIns';
import createTypesOperations from './createTypesOperations';
import {
  createConnection,
  createConnectionArguments
} from './connections';

/**
 * Given map of built-in types and database metadata about custom data,
 * construct GraphQL schema for them.
 */
export default function createSchema({
  builtIns,
  genericQueries,
  genericMutations,
  typeQueries,
  typeMutations,
}, dbMetadata) {
  const interfaces = createInterfaces();
  let types = builtIns.map((builtIn) => new TypeSet({
    type: builtIn,
    connection: createConnection(builtIn),
    inputObject: createInputObject(builtIn),
  }));

  dbMetadata.forEach((typeMetadata) => {
    const typeName = typeMetadata.get('name');
    const type = createType(typeMetadata, (name) => {
      return types.get(name);
    }, interfaces);
    const connection = createConnection(type, interfaces);
    types = types.set(typeName, new TypeSet({
      type, connection,
    }));
  });

  types = types.map((type) => {
    return type.set('inputObject', createInputObject(type, interfaces));
  });

  const queryFields = genericQueries.merge(
    createTypesOperations(typeQueries, types)
  );

  const mutationFields = genericMutations.merge(
    createTypesOperations(typeMutations, types)
  );

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: queryFields.toObject(),
  });

  const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: mutationFields.toObject(),
  });

  return new GraphQLSchema({
    query,
    mutation,
  });
}

class TypeSet extends Record({
  type: undefined,
  connection: undefined,
  inputObject: undefined,
}) {}

function createType(type, getType) {
  return new GraphQLObjectType({
    name: type.get('name'),
    fields: () => type
      .get('fields')
      .toKeyedSeq()
      .mapEntries(([, field]) => [
        field.get('name'),
        createField(field, getType),
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

function createField(field, getType) {
  const fieldName = field.get('name');
  const fieldType = field.get('type');
  let type;
  let resolve;
  let argDef = Map();
  if (fieldType === 'connection' && field.has('target')) {
    const target = field.get('target');
    type = getType(target).connection;
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
    type = getType(fieldType).type;
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
      .filter((field) => {
        return (
          !field.getInterfaces ||
          field.getInterfaces().indexOf(Connection) < 0
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

        if (type instanceof GraphQLInputObjectType ||
            type instanceof GraphQLScalarType) {
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
      }),
  });
}
