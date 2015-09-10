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
      fields: {
        id: {
          type: new GraphQLNonNull(ReindexID),
        },
        value: {
          type: GraphQLString,
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
