import {List} from 'immutable';
import {
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLString,
} from 'graphql';
import ReindexID from './ReindexID';
import createCreate from '../mutations/createCreate';
import TypeSet from '../TypeSet';

const baseCredentialFields = {
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

export default function createUserTypes(interfaces) {
  const ReindexCredential = new GraphQLInterfaceType({
    name: 'ReindexCredential',
    description: '',
    fields: {
      ...baseCredentialFields,
    },
  });
  const ReindexGithubCredential = new GraphQLObjectType({
    name: 'ReindexGithubCredential',
    fields: {
      ...baseCredentialFields,
      email: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
      },
    },
    interfaces: [
      ReindexCredential,
    ],
  });
  const ReindexFacebookCredential = new GraphQLObjectType({
    name: 'ReindexFacebookCredential',
    fields: {
      ...baseCredentialFields,
    },
    interfaces: [
      ReindexCredential,
    ],
  });
  const ReindexGoogleCredential = new GraphQLObjectType({
    name: 'ReindexGoogleCredential',
    fields: {
      ...baseCredentialFields,
    },
    interfaces: [
      ReindexCredential,
    ],
  });
  const ReindexTwitterCredential = new GraphQLObjectType({
    name: 'ReindexTwitterCredential',
    fields: {
      ...baseCredentialFields,
      accessTokenSecret: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
      },
    },
    interfaces: [
      ReindexCredential,
    ],
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
  const ReindexUser = new GraphQLObjectType({
    name: 'ReindexUser',
    fields: {
      id: {
        type: ReindexID,
      },
      credentials: {
        type: ReindexCredentialCollection,
      },
    },
    interfaces: [
      interfaces.Node,
    ],
    isTypeOf(obj) {
      return obj.id.type === 'ReindexUser';
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
    ReindexUser: new TypeSet({
      type: ReindexUser,
      blacklistedRootFields: List([
        createCreate,
      ]),
    }),
  };
}
