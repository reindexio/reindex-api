import {List} from 'immutable';
import {
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLID,
  GraphQLString,
} from 'graphql';
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
    type: GraphQLID,
  },
};

function createCredentials({Builtin}) {
  const Credential = new GraphQLInterfaceType({
    name: 'ReindexCredential',
    description: '',
    fields: {
      ...baseCredentialFields,
    },
  });
  const GithubCredential = new GraphQLObjectType({
    name: 'ReindexGithubCredential',
    fields: {
      ...baseCredentialFields,
      username: {
        type: GraphQLString,
      },
    },
    interfaces: [Builtin, Credential],
  });
  const FacebookCredential = new GraphQLObjectType({
    name: 'ReindexFacebookCredential',
    fields: {
      ...baseCredentialFields,
    },
    interfaces: [Builtin, Credential],
  });
  const GoogleCredential = new GraphQLObjectType({
    name: 'ReindexGoogleCredential',
    fields: {
      ...baseCredentialFields,
    },
    interfaces: [Builtin, Credential],
  });
  const TwitterCredential = new GraphQLObjectType({
    name: 'ReindexTwitterCredential',
    fields: {
      ...baseCredentialFields,
      username: {
        type: GraphQLString,
      },
    },
    interfaces: [Builtin, Credential],
  });

  return new GraphQLObjectType({
    name: 'ReindexCredentialCollection',
    fields: {
      github: {
        type: GithubCredential,
      },
      facebook: {
        type: FacebookCredential,
      },
      google: {
        type: GoogleCredential,
      },
      twitter: {
        type: TwitterCredential,
      },
    },
    interfaces: [Builtin],
  });
}

export default function createUser(interfaces) {
  const CredentialCollection = createCredentials(interfaces);
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexUser',
      fields: {
        id: {
          type: GraphQLID,
        },
        credentials: {
          type: CredentialCollection,
        },
      },
      interfaces: [interfaces.Builtin, interfaces.ExtendableBuiltin],
    }),
    blacklistedRootFields: List([
      createCreate,
    ]),
  });
}
