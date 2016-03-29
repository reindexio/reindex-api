import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';
import { chain, mapValues, forEach } from 'lodash';

import TypeSet from './TypeSet';
import { getAllQueryName, getPayloadTypeName } from './derivedNames';
import createInterfaces from './builtins/createInterfaces';
import createCommonTypes from './builtins/createCommonTypes';
import CommonQueryFieldCreators from './builtins/CommonQueryFieldCreators';
import createViewer, { VIEWER_ID } from './builtins/createViewer';
import ReindexID from './builtins/ReindexID';
import CommonMutationFieldCreators
  from './builtins/CommonMutationFieldCreators';
import ScalarTypes from './builtins/ScalarTypes';
import TypeQueryFieldCreators from './builtins/TypeQueryFieldCreators';
import TypeMutationFieldCreators from './builtins/TypeMutationFieldCreators';
import clientMutationIdField from './utilities/clientMutationIdField';
import {
  createConnection,
  createConnectionArguments,
  createConnectionFieldResolve,
  createNodeFieldResolve,
 } from './connections';

/**
 * Given map of built-in types and database metadata about custom data,
 * construct GraphQL schema for them.
 *
 * `extraRootFields` is a map of additional root fields to inject. It's a map
 * with keys as object:
 *   * `name` - name of the field to inject
 *   * `returnTypeName` - name of the return type (as string)
 *   * `returnTypeType` - type of the return type (type, payload, connection)
 *   * `resolve` - resolve function
 */
export default function createSchema(dbMetadata, extraRootFields) {
  const interfaces = createInterfaces();
  let typeSets;
  let viewer;

  function getTypeSet(name) {
    return typeSets[name];
  }

  typeSets = {
    ...createCommonTypes(interfaces, getTypeSet),
    ...chain(dbMetadata)
      .map((typeMetadata) => {
        const kind = typeMetadata.kind;
        if (kind === 'OBJECT') {
          const type = createObjectType(typeMetadata, getTypeSet, interfaces);
          return new TypeSet({
            type,
            pluralName: typeMetadata.pluralName,
            orderableFields: chain(typeMetadata.fields)
              .filter((field) => field.orderable)
              .map((field) => field.name)
              .value(),
          });
        }
      })
      .indexBy((typeSet) => typeSet.type.name)
      .value(),
  };

  forEach(typeSets, (typeSet) => {
    if (typeSet.type.getInterfaces().includes(interfaces.Node)) {
      const { connection, edge } = createConnection(typeSet, interfaces);
      typeSet.connection = connection;
      typeSet.edge = edge;
      typeSet.payload = createPayload(typeSet, interfaces, () => viewer);
    }
  });

  viewer = createViewer(typeSets, interfaces);

  const queryFields = {
    ...mapValues(CommonQueryFieldCreators, (creator) =>
      creator(typeSets, interfaces, viewer)
    ),
    ...createRootFieldsForTypes(
      TypeQueryFieldCreators,
      typeSets,
      interfaces,
      viewer
    ),
  };

  const mutationFields = {
    ...mapValues(CommonMutationFieldCreators, (creator) =>
      creator(typeSets, interfaces, viewer)
    ),
    ...createRootFieldsForTypes(
      TypeMutationFieldCreators,
      typeSets,
      interfaces,
      viewer
    ),
  };

  if (extraRootFields) {
    for (const fieldName in extraRootFields) {
      const field = extraRootFields[fieldName];
      const type = typeSets[field.returnTypeName];
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

function createRootFieldsForTypes(creators, typeSets, interfaces, viewer) {
  return chain(typeSets)
    .filter((typeSet) => typeSet.type.getInterfaces().includes(interfaces.Node))
    .map((typeSet) => chain(creators)
      .filter((creator) => !typeSet.blacklistedRootFields.includes(creator))
      .map((creator) => creator(typeSet, interfaces, typeSets, viewer))
      .flatten()
      .indexBy((query) => query.name)
      .value())
    .reduce((all, queries) => Object.assign(all, queries))
    .value();
}

function createObjectType(type, getTypeSet, interfaces) {
  const config = {
    name: type.name,
    description: type.description || null,
    fields: () => chain(type.fields)
      .map((field) => createField(field, getTypeSet, interfaces))
      .indexBy((field) => field.name)
      .value(),
    interfaces: type.interfaces.map((name) => interfaces[name]),
  };
  if (config.interfaces.includes(interfaces.Node)) {
    config.isTypeOf = (value) => value.id && value.id.type === type.name;
  }

  return new GraphQLObjectType(config);
}

function createField(field, getTypeSet, interfaces) {
  const fieldName = field.name;
  const fieldType = field.type;

  let type;
  let resolve;
  let argDef = {};
  if (fieldType === 'Connection') {
    const ofType = field.ofType;
    const reverseName = field.reverseName;
    const defaultOrdering = field.defaultOrdering || {};
    type = getTypeSet(ofType).connection;
    argDef = createConnectionArguments(ofType, getTypeSet);
    resolve = createConnectionFieldResolve(
      ofType, reverseName, defaultOrdering
    );
  } else if (fieldType === 'List') {
    const innerType = (
      ScalarTypes[field.ofType] || getTypeSet(field.ofType).type
    );
    type = new GraphQLList(innerType);
  } else if (fieldType in ScalarTypes) {
    type = ScalarTypes[fieldType];
  } else {
    type = getTypeSet(fieldType).type;
    if (type.getInterfaces().includes(interfaces.Node)) {
      resolve = createNodeFieldResolve(type.name, fieldName);
    } else {
      resolve = (parent) => {
        if (parent[fieldName]) {
          return {
            ...parent[fieldName],
            __node: parent.__node || parent,
          };
        } else {
          return null;
        }
      };
    }
  }

  if (field.nonNull) {
    type = new GraphQLNonNull(type);
  }

  return {
    name: fieldName,
    type,
    args: argDef,
    resolve,
    deprecationReason: field.deprecationReason || null,
    description: field.description || null,
    metadata: {
      ...field,
    },
  };
}

function createPayload({ type, edge, pluralName }, interfaces, getViewer) {
  const allConnectionName = getAllQueryName(type.name, pluralName);
  const edgeName = `changed${type.name}Edge`;
  return new GraphQLObjectType({
    name: getPayloadTypeName(type.name),
    description:
`The payload returned from mutations of \`${type.name}\`.

* [Reindex docs: Mutations
](https://www.reindex.io/docs/graphql-api/mutations/)
`,
    fields: () => {
      const nodeFields = chain(type.getFields())
        .pick((field) => (
          field.type.getInterfaces &&
          field.type.getInterfaces().includes(interfaces.Node)
        ))
        .mapValues((field) => ({
          type: field.type,
          resolve: createNodeFieldResolve(
            field.type.name,
            (object) => object['changed' + type.name][field.name]
          ),
        }))
        .value();
      return {
        clientMutationId: clientMutationIdField,
        id: {
          type: ReindexID,
          description: 'The ID of the mutated object.',
        },
        viewer: {
          type: getViewer(),
          description:
`The global viewer object. Can be used in the client to add
a newly created object to the connection of all objects of
the type.

E.g. when creating a ${type.name} object, you can add it
to \`viewer.${allConnectionName}\` using the following Relay
mutation config:
\`\`\`javascript
{
  type: 'RANGE_ADD',
  parentID: this.props.viewer.id,
  connectionName: '${allConnectionName}',
  edgeName: '${edgeName}',
  rangeBehaviors: {
    '': 'prepend',
  },
}
\`\`\`
`,
          resolve() {
            return {
              id: VIEWER_ID,
            };
          },
        },
        ...nodeFields,
        ['changed' + type.name]: {
          type,
          description: 'The mutated object.',
        },
        [edgeName]: {
          type: edge,
          description:
`A connection edge containing the mutated object. Can be used to add a newly
created object to a connection in Relay.
`,
        },
      };
    },
  });
}
