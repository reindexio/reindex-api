import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import TypeSet from '../TypeSet';
import ProviderType from './ProviderType';

export default function createAuthenticationProvider({Builtin}) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexAuthenticationProvider',
      fields: {
        clientId: {
          type: GraphQLID,
        },
        clientSecret: {
          type: GraphQLString,
        },
        id: {
          type: ProviderType,
        },
        isEnabled: {
          type: GraphQLBoolean,
        },
      },
      interfaces: [Builtin],
    }),
  });
}
