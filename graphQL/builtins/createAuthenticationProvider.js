import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
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
          type: ReindexID,
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
        interfaces.ReindexNode,
      ],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexAuthenticationProvider';
      },
    }),
  });
}
