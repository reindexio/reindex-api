import { GraphQLNonNull } from 'graphql';
import ReindexID from '../builtins/ReindexID';
import { isViewerID } from '../builtins/createViewer';
import checkPermission from '../permissions/checkPermission';

export default function createNode(typeSets, interfaces) {
  return {
    name: 'node',
    /* eslint-disable */
    description:
`All Reindex types that implement interface \`Node\` have an \`id\` that is
globally unique among all types. By using this fact, it's possible to retrieve
any type by this id. \`node\` root field does exactly that - returns any object
 that has \`Node\` interface.

* [Relay docs: Object Identification
](https://facebook.github.io/relay/docs/graphql-object-identification.html#content)

Note that \`Node\` only has one field - \`id\`. If you want to retrieve fields of
concrete type, you need to use typed fragment.

\`\`\`graphql
query NodeExample {
  node(id: "some-id") {
    id,
    ... on Todo {
      text,
      completed,
    }
  }
}
\`\`\`
`,
    /* eslint-enable */
    type: interfaces.Node,
    args: {
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the object.',
      },
    },
    async resolve(parent, { id }, context, info) {
      if (isViewerID(id)) {
        return {
          id,
        };
      }
      const type = info.schema.getType(id.type);
      if (!type || !type.getInterfaces().includes(interfaces.Node)) {
        return null;
      }
      const result = await context.db.getByID(type.name, id);
      await checkPermission(type.name, 'read', {}, result, context);
      return result;
    },
  };
}
