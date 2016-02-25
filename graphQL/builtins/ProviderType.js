import {
  GraphQLEnumType,
} from 'graphql';

export const ProviderType = new GraphQLEnumType({
  name: 'ReindexProviderType',
  description: 'Defines the type of authentication service.',
  values: {
    auth0: {
      description: 'Auth0',
    },
    facebook: {
      description: 'Facebook Login',
    },
    github: {
      description: 'GitHub Authentication',
    },
    google: {
      description: 'Google OAuth 2.0',
    },
    twitter: {
      description: 'Sign in with Twitter',
    },
  },
});

export default ProviderType;
