import {
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';
import { chain, mapValues } from 'lodash';

import CommonQueryFieldCreators from './builtins/CommonQueryFieldCreators';
import createViewer from './builtins/createViewer';
import CommonMutationFieldCreators
  from './builtins/CommonMutationFieldCreators';
import TypeQueryFieldCreators from './builtins/TypeQueryFieldCreators';
import TypeMutationFieldCreators from './builtins/TypeMutationFieldCreators';

/**
 *
 * Create GraphQL schema from TypeRegistry
 *
 * `extraRootFields` is a map of additional root fields to inject. It's a map
 * with keys as object:
 *   * `name` - name of the field to inject
 *   * `returnTypeName` - name of the return type (as string)
 *   * `returnTypeType` - type of the return type (type, payload, connection)
 *   * `resolve` - resolve function
 */
export default function createSchema(typeRegistry, extraRootFields) {
  typeRegistry.registerViewer(createViewer(typeRegistry));

  const queryFields = {
    ...mapValues(CommonQueryFieldCreators, (creator) =>
      creator(typeRegistry)
    ),
    ...createRootFieldsForTypes(
      TypeQueryFieldCreators,
      typeRegistry,
    ),
  };

  const mutationFields = {
    ...mapValues(CommonMutationFieldCreators, (creator) =>
      creator(typeRegistry)
    ),
    ...createRootFieldsForTypes(
      TypeMutationFieldCreators,
      typeRegistry
    ),
  };

  if (extraRootFields) {
    for (const fieldName in extraRootFields) {
      const field = extraRootFields[fieldName];
      const type = typeRegistry.getTypeSet(field.returnTypeName);
      const typeType = field.returnTypeType;
      if (!queryFields[fieldName] && type && type[typeType]) {
        queryFields[fieldName] = {
          ...field,
          type: type[typeType],
        };
      }
    }
  }

  const query = new GraphQLObjectType({
    name: 'ReindexQueryRoot',
    description: 'The query root.',
    fields: queryFields,
  });

  const mutation = new GraphQLObjectType({
    name: 'ReindexMutationRoot',
    description: 'The mutation root.',
    fields: mutationFields,
  });

  return new GraphQLSchema({
    query,
    mutation,
  });
}

function createRootFieldsForTypes(creators, typeRegistry) {
  return chain(typeRegistry.getTypeSets())
    .filter((typeSet) => typeSet.type.getInterfaces().includes(
      typeRegistry.getInterface('Node')
    ))
    .map((typeSet) => chain(creators)
      .filter((creator) => !typeSet.blacklistedRootFields.includes(creator))
      .map((creator) => creator(typeSet, typeRegistry))
      .flatten()
      .indexBy((query) => query.name)
      .value())
    .reduce((all, queries) => Object.assign(all, queries))
    .value();
}
