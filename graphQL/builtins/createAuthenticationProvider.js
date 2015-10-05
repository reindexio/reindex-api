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
      description:
`An authentication provider includes the settings for an
authentication method used for signup and login.

Currently supported providers are:
* Facebook (provider type \`facebook\`)
* Google (provider type \`google\`)
* Twitter (provider type \`twitter\`)
* GitHub (provider type \`github\`)

See also:
[Reindex tutorial: Authentication
](https://www.reindex.io/docs/tutorial/authentication/)
`,
      fields: {
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
        },
        type: {
          type: ProviderType,
          description: 'The provider type (e.g. facebook).',
        },
        clientId: {
          type: GraphQLString,
          description: 'The client ID for the application (e.g. for the ' +
            '`facebook` provider this is `Facebook App ID` of the Facebook ' +
            'app used for authentication.',
        },
        clientSecret: {
          type: GraphQLString,
          description: 'The client secret for the application (e.g. for the ' +
            '`facebook` provider this is the `Facebook App Secret` of the ' +
            'Facebook app used for authentication.',
        },
        isEnabled: {
          type: GraphQLBoolean,
          description: 'Must be set to `true` to enable user authentication ' +
            'using this provider.',
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
