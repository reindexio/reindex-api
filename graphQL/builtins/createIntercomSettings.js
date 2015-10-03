import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';

import TypeSet from '../TypeSet';

export default function createIntercomSettings() {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexIntercomSettings',
      fields: {
        appId: {
          type: GraphQLString,
        },
        userHash: {
          type: GraphQLString,
        },
        userId: {
          type: GraphQLString,
        },
      },
    }),
  });
}
