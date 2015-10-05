import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import TypeSet from '../TypeSet';

function getBaseCredentialFields(providerName) {
  return {
    accessToken: {
      type: GraphQLString,
      description: `The OAuth access token obtained for the ${providerName} ` +
        'user during authentication.',
    },
    displayName: {
      type: GraphQLString,
      description: `The ${providerName} user's full name.`,
    },
    id: {
      type: GraphQLString,
      description: `The ${providerName} user's ID`,
    },
  };
}

export default function createUserTypes() {
  const ReindexGithubCredential = new GraphQLObjectType({
    name: 'ReindexGithubCredential',
    description: 'GitHub authentication credentials.',
    fields: {
      ...getBaseCredentialFields('GitHub'),
      email: {
        type: GraphQLString,
        description: 'The GitHub user\'s email address',
      },
      username: {
        type: GraphQLString,
        description: 'The user\'s GitHub username',
      },
    },
  });
  const ReindexFacebookCredential = new GraphQLObjectType({
    name: 'ReindexFacebookCredential',
    description: 'Facebook authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Facebook'),
    },
  });
  const ReindexGoogleCredential = new GraphQLObjectType({
    name: 'ReindexGoogleCredential',
    description: 'Google authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Google'),
    },
  });
  const ReindexTwitterCredential = new GraphQLObjectType({
    name: 'ReindexTwitterCredential',
    description: 'Twitter authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Twitter'),
      accessTokenSecret: {
        type: GraphQLString,
        description: 'The OAuth token secret obtained for the Twitter user ' +
          'during authentication.',
      },
      username: {
        type: GraphQLString,
        description: 'The user\'s Twitter screen name.',
      },
    },
  });
  const ReindexCredentialCollection = new GraphQLObjectType({
    name: 'ReindexCredentialCollection',
    description:
      'The credentials of the user in different authentication services.',
    fields: {
      facebook: {
        type: ReindexFacebookCredential,
        description: 'The Facebook credentials of the authenticated user.',
      },
      github: {
        type: ReindexGithubCredential,
        description: 'The GitHub credentials of the authenticated user.',
      },
      google: {
        type: ReindexGoogleCredential,
        description: 'The Google credentials of the authenticated user.',
      },
      twitter: {
        type: ReindexTwitterCredential,
        description: 'The Twitter credentials of the authenticated user.',
      },
    },
  });

  return {
    ReindexCredentialCollection: new TypeSet({
      type: ReindexCredentialCollection,
    }),
    ReindexFacebookCredential: new TypeSet({
      type: ReindexFacebookCredential,
    }),
    ReindexGithubCredential: new TypeSet({
      type: ReindexGithubCredential,
    }),
    ReindexGoogleCredential: new TypeSet({
      type: ReindexGoogleCredential,
    }),
    ReindexTwitterCredential: new TypeSet({
      type: ReindexTwitterCredential,
    }),
  };
}
