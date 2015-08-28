import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import TypeSet from '../TypeSet';

function getBaseCredentialFields() {
  return {
    accessToken: {
      type: GraphQLString,
    },
    displayName: {
      type: GraphQLString,
    },
    id: {
      type: GraphQLString,
    },
  };
}

export default function createUserTypes() {
  const ReindexGithubCredential = new GraphQLObjectType({
    name: 'ReindexGithubCredential',
    fields: {
      ...getBaseCredentialFields(),
      email: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
      },
    },
  });
  const ReindexFacebookCredential = new GraphQLObjectType({
    name: 'ReindexFacebookCredential',
    fields: {
      ...getBaseCredentialFields(),
    },
  });
  const ReindexGoogleCredential = new GraphQLObjectType({
    name: 'ReindexGoogleCredential',
    fields: {
      ...getBaseCredentialFields(),
    },
  });
  const ReindexTwitterCredential = new GraphQLObjectType({
    name: 'ReindexTwitterCredential',
    fields: {
      ...getBaseCredentialFields(),
      accessTokenSecret: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
      },
    },
  });
  const ReindexCredentialCollection = new GraphQLObjectType({
    name: 'ReindexCredentialCollection',
    fields: {
      facebook: {
        type: ReindexFacebookCredential,
      },
      github: {
        type: ReindexGithubCredential,
      },
      google: {
        type: ReindexGoogleCredential,
      },
      twitter: {
        type: ReindexTwitterCredential,
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
