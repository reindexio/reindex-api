import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLEnumType,
} from 'graphql';

import * as derivedNames from '../derivedNames';
import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import createDelete from '../mutations/createDelete';
import TypeSet from '../TypeSet';
import ReindexID from './ReindexID';
import Order from './Order';
import {
  createConnectionFieldResolve,
  createConnectionArguments,
} from '../connections';

export default function createTypeTypes(interfaces, getTypeSet) {
  const permissionGrantee = new GraphQLEnumType({
    name: 'ReindexGranteeType',
    description:
`Who to grant the permission to.

Possible values:

* \`USER\` - user pointed to by userPath
* \`AUTHENTICATED\` - any authenticated user
* \`EVERYONE\` - everyone
`,
    values: {
      USER: {
        value: 'USER',
      },
      AUTHENTICATED: {
        value: 'AUTHENTICATED',
      },
      EVERYONE: {
        value: 'EVERYONE',
      },
    },
  });

  const permission = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexPermission',
      description:
`Permission. Depending on the \`grantee\` applies to either user pointed through
\`userPath\`, authenticated users or anyone.

\`grantee\` is either \`USER\`, \`AUTHENTICATED\` or \`EVERYONE\`. If
\`grantee\` is \`USER\`, userPath MUST be specified. Otherwise \`userPath\`
 MUST NOT be specified.
 `,
      fields: {
        grantee: {
          type: new GraphQLNonNull(permissionGrantee),
          description: 'Who to grant permission to.',
        },
        userPath: {
          type: new GraphQLList(GraphQLString),
          description:
`Path to \`User\` object or a many-to-many connection of \`User\` objects. Must
be null if grantee is not \`USER\`.`,
        },
        create: {
          type: GraphQLBoolean,
          description: 'If true, grants a create permission.',
        },
        read: {
          type: GraphQLBoolean,
          description: 'If true, grants a read permission.',
        },
        update: {
          type: GraphQLBoolean,
          description: 'If true, grants an update permission.',
        },
        delete: {
          type: GraphQLBoolean,
          description: 'If true, grants a delete permission.',
        },
        permittedFields: {
          type: new GraphQLList(GraphQLString),
          description:
`List of fields which can be modified when creating, updating or replacing.`,
        },
      },
    }),
  });

  const ordering = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexOrdering',
      description:
`A sort ordering, consist of a name of a field and an order
(ascending/descending).
`,
      fields: {
        order: {
          type: Order,
          description: 'A sorting order, either ASC or DESC.',
        },
        field: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'The name of the field the result is sorted by.',
        },
      },
    }),
  });

  // XXX(freiksenet, 2015-08-19): Interface would be nicer, but there is no
  // way to neatly convert it to InputObjectType
  const field = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexField',
      description: 'A field of a custom type.',
      fields: {
        type: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'The return type of the field',
        },
        name: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'Name of the field.',
        },
        description: {
          type: GraphQLString,
          description: 'Description for the GraphQL field.',
        },
        nonNull: {
          type: GraphQLBoolean,
          description: 'Defines whether this field will be non-null in the ' +
            'output type.',
        },
        builtin: {
          type: GraphQLBoolean,
          description: 'True for builtin fields defined by the system.',
        },
        readOnly: {
          type: GraphQLBoolean,
          description: 'If true, can not be updated by anyone, but admin.',
        },
        deprecationReason: {
          type: GraphQLString,
          description: 'If set, makes the field show as deprecated.',
        },
        ofType: {
          type: GraphQLString,
          description: 'The inner type for a Connection or List field.',
        },
        reverseName: {
          type: GraphQLString,
          description: 'For Connection and Node fields, the name of the ' +
            'related field in the connected type.',
        },
        grantPermissions: {
          type: permission.type,
          deprecationReason: 'Use type `permissions` field',
          description: 'For fields of type `User`, the permissions granted ' +
            'to the user connected using this field.',
        },
        defaultOrdering: {
          type: ordering.type,
          description: 'Default ordering (for a connection field).',
        },
        unique: {
          type: GraphQLBoolean,
          description:
`If set, the field value must be unique. Can only be set on scalar fields.
Unique fields are validated on mutation. In addition, for each unique field a
new root query field is created to get values based on that field.`,
        },
        orderable: {
          type: GraphQLBoolean,
          description:
`If set, orderBy can be used on this field. Can be only set on scalar fields.`,
        },
      },
    }),
  });

  const introspection = new GraphQLObjectType({
    name: 'ReindexTypeIntrospection',
    description:
'Generated names for derived types, queries and mutations of the type.',
    fields: () => ({
      // Possible additions - list of all byUnique query type and
      // connection mutations
      connectionTypeName: {
        type: GraphQLString,
        description: 'Name of connection type for the type.',
        resolve: (parent) => derivedNames.getConnectionTypeName(parent.name),
      },
      payloadTypeName: {
        type: GraphQLString,
        description: 'Name of payload (mutation result) for the type.',
        resolve: (parent) => derivedNames.getPayloadTypeName(parent.name),
      },
      edgeTypeName: {
        type: GraphQLString,
        description: 'Name of edge (element of connection) for the type.',
        resolve: (parent) => derivedNames.getEdgeTypeName(parent.name),
      },
      allQueryName: {
        type: GraphQLString,
        description: 'Name of the query to get all nodes of the type.',
        resolve: (parent) => derivedNames.getAllQueryName(
          parent.name,
          parent.pluralName
        ),
      },
      byIdQueryName: {
        type: GraphQLString,
        description: 'Name of query to get node of the type by id',
        resolve: (parent) => derivedNames.getUniqueFieldQueryName(
          parent.name,
          'id',
        ),
      },
      createMutationName: {
        type: GraphQLString,
        description: 'Name of create mutation of the type.',
        resolve: (parent) => derivedNames.getCreateMutationName(parent.name),
      },
      createMutationInputName: {
        type: GraphQLString,
        description:
'Name of input type for the create mutation of the type.',
        resolve: (parent) => derivedNames.getCreateMutationName(parent.name),
      },
      updateMutationName: {
        type: GraphQLString,
        description: 'Name of update mutation of the type.',
        resolve: (parent) => derivedNames.getUpdateMutationName(parent.name),
      },
      updateMutationInputName: {
        type: GraphQLString,
        description:
'Name of input type for the update mutation of the type.',
        resolve: (parent) => derivedNames.getUpdateInputObjectTypeName(
          parent.name
        ),
      },
      replaceMutationName: {
        type: GraphQLString,
        description: 'Name of replace mutation of the type.',
        resolve: (parent) => derivedNames.getReplaceMutationName(parent.name),
      },
      replaceMutationInputName: {
        type: GraphQLString,
        description:
'Name of input type for the replace mutation of the type.',
        resolve: (parent) => derivedNames.getReplaceInputObjectTypeName(
          parent.name
        ),
      },
      deleteMutationName: {
        type: GraphQLString,
        resolve: (parent) => derivedNames.getDeleteMutationName(parent.name),
        description: 'Name of delete mutation of the type.',
      },
      deleteMutationInputName: {
        type: GraphQLString,
        description:
'Name of input type for the delete mutation of the type.',
        resolve: (parent) => derivedNames.getDeleteInputObjectTypeName(
          parent.name
        ),
      },
    }),
  });

  const type = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexType',
      description:
`A custom type defined in the app. Normally created by
creating a migration with the CLI tool.

* [Reindex docs: Reindex Schema
](https://www.reindex.io/docs/reindex-schema/)
* [Reindex docs: Reindex CLI
](https:///www.reindex.io/docs/reindex-cli/)
* [Reindex tutorial: Defining the schema
](https://www.reindex.io/docs/tutorial/defining-the-schema/)
* [Reindex docs: migrate
](https://www.reindex.io/docs/graphql-api/mutations/#migrate)
`,
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
          metadata: {
            unique: true,
          },
        },
        kind: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'The kind of the type. ' +
            '(Only "OBJECT" is currently supported.)',
        },
        name: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'The name of the type.',
          metadata: {
            unique: true,
            orderable: true,
          },
        },
        description: {
          type: GraphQLString,
          description: 'Description of the type.',
        },
        interfaces: {
          type: new GraphQLList(GraphQLString),
          description: 'The names of interfaces the type implements. ' +
            '(Only "Node" is currently supported.)',
        },
        fields: {
          type: new GraphQLList(field.type),
          description: 'A list of fields for the type.',
        },
        permissions: {
          type: new GraphQLList(permission.type),
          description: 'All the object-level permissions for the type',
        },
        pluralName: {
          type: GraphQLString,
          description: 'An optional pluralized name for the type. If not ' +
           'specified, the default English pluralization will be used for ' +
           'field names like `allStories`.',
        },
        hooks: {
          type: getTypeSet('ReindexHook').connection,
          args: createConnectionArguments('ReindexHook', getTypeSet),
          resolve: createConnectionFieldResolve('ReindexHook', 'type'),
          description: '',
        },
        introspection: {
          type: introspection,
          resolve: (parent) => parent,
          metadata: {
            computed: true,
          },
        },
      }),
      interfaces: [interfaces.Node],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexType';
      },
    }),
    blacklistedRootFields: [
      createCreate,
      createUpdate,
      createReplace,
      createDelete,
    ],
  });

  return {
    ReindexPermission: permission,
    ReindexField: field,
    ReindexType: type,
    ReindexOrdering: ordering,
  };
}
