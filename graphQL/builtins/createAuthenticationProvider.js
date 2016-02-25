import ProviderType from './ProviderType';
import ReindexID from './ReindexID';
import TypeSet from '../TypeSet';
import {
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';

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


* [Reindex docs: Authentication
](https://www.reindex.io/docs/security/authentication/)
* [Reindex tutorial: Authentication
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
          metadata: {
            unique: true,
          },
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
        domain: {
          type: GraphQLString,
          description: 'The namespace of the application, e.g. ' +
            '"example.auth0.com". Only used by the Auth0 provider.',
        },
        isEnabled: {
          type: GraphQLBoolean,
          description: 'Must be set to `true` to enable user authentication ' +
            'using this provider.',
        },
        scopes: {
          type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          description: 'An array of scopes (permissions) to request from the ' +
            'person using the authentication. Supported in Facebook, GitHub ' +
            'and Google providers.',
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
