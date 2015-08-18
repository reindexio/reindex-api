import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql';
import TypeSet from '../TypeSet';
import ReindexID from './ReindexID';
import ProviderType from './ProviderType';

export default function createAuthenticationProvider(interfaces) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexAuthenticationProvider',
      fields: {
        id: {
          type: new GraphQLNonNull(ReindexID),
        },
        type: {
          type: ProviderType,
        },
        clientId: {
          type: GraphQLString,
        },
        clientSecret: {
          type: GraphQLString,
        },
        isEnabled: {
          type: GraphQLBoolean,
        },
      },
      interfaces: [
        interfaces.Node,
      ],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexAuthenticationProvider';
      },
    }),
  });
}
