import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import TypeSet from '../TypeSet';

export default function createSecret(interfaces) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexSecret',
      description:
`Stores a secret used for signing authentication tokens for an app.

* [Reindex docs: Authentication
](https://www.reindex.io/docs/security/authentication/)
`,
      fields: {
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
          metadata: {
            unique: true,
          },
        },
        value: {
          type: GraphQLString,
          description:
            'A long secret string used for signing authentication tokens.',
        },
      },
      interfaces: [
        interfaces.Node,
      ],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexSecret';
      },
    }),
    blacklistedRootFields: [
      createCreate,
      createUpdate,
      createReplace,
    ],
  });
}
