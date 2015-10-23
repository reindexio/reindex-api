import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import TypeSet from '../TypeSet';
import { createNodeFieldResolve } from '../connections';

export default function createPermission(interfaces, getTypeSet) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexPermission',
      description:
`A create/read/update/delete permission to a specific type.
Can be granted to a specific \`user\`, or as a wildcard permission to
all users by setting user to \`null\`.

* [Reindex docs: Authorization
](https://www.reindex.io/docs/security/authorization/)
`,
      interfaces: [interfaces.Node],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexPermission';
      },
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
        },
        user: {
          type: getTypeSet('User').type,
          resolve: createNodeFieldResolve('User', 'user'),
          description: 'The user the permission is granted to.',
        },
        type: {
          type: getTypeSet('ReindexType').type,
          resolve: createNodeFieldResolve('ReindexType', 'type'),
          description: 'The type the permission applies to.',
        },
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
      }),
    }),
  });
}
