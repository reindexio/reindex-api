import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLEnumType,
} from 'graphql';
import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import createDelete from '../mutations/createDelete';
import TypeSet from '../TypeSet';
import ReindexID from './ReindexID';
import {
  createConnectionFieldResolve,
  createConnectionArguments,
} from '../connections';

export default function createTypeTypes(interfaces, getTypeSet) {
  const OrderEnum = new GraphQLEnumType({
    name: 'ReindexOrder',
    description: 'A sort order (ascending/descending).',
    values: {
      ASC: {
        value: 'ASC',
      },
      DESC: {
        value: 'DESC',
      },
    },
  });

  const permissionSet = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexPermissionSet',
      description: 'A set of granted permissions.',
      fields: {
        read: {
          type: GraphQLBoolean,
          description: 'If true, grants a read permission.',
        },
        create: {
          type: GraphQLBoolean,
          description: 'If true, grants a create permission.',
        },
        update: {
          type: GraphQLBoolean,
          description: 'If true, grants an update permission.',
        },
        delete: {
          type: GraphQLBoolean,
          description: 'If true, grants a delete permission.',
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
          type: OrderEnum,
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
          type: permissionSet.type,
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
          type: getTypeSet('ReindexPermission').connection,
          args: createConnectionArguments(getTypeSet, interfaces),
          resolve: createConnectionFieldResolve('ReindexPermission', 'type'),
          description: 'All the permissions defined for this type.',
        },
        pluralName: {
          type: GraphQLString,
          description: 'An optional pluralized name for the type. If not ' +
           'specified, the default English pluralization will be used for ' +
           'field names like `allStories`.',
        },
        hooks: {
          type: getTypeSet('ReindexHook').connection,
          args: createConnectionArguments(getTypeSet, interfaces),
          resolve: createConnectionFieldResolve('ReindexHook', 'type'),
          description: '',
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
    ReindexPermissionSet: permissionSet,
    ReindexField: field,
    ReindexType: type,
    ReindexOrdering: ordering,
  };
}
