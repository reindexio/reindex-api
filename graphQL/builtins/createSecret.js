import {List} from 'immutable';
import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql';
import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import TypeSet from '../TypeSet';

export default function createSecret({Builtin}) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexSecret',
      fields: {
        id: {
          type: GraphQLID,
        },
        value: {
          type: GraphQLString,
        },
      },
      interfaces: [Builtin],
    }),
    blacklistedRootFields: List([
      createCreate,
      createUpdate,
      createReplace,
    ]),
  });
}
