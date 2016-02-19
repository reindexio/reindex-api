import fetch from 'node-fetch';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { GraphQLError } from 'graphql/error';

import clientMutationIdField from '../utilities/clientMutationIdField';
import getOrCreateUser from '../../authentication/getOrCreateUser';
import signToken from '../../authentication/signToken';
import { fromReindexID } from '../builtins/ReindexID';
import { profile } from '../../authentication/Auth0Provider';

export default function createLoginWithAccessToken(typeSets) {
  const LoginTokenType = new GraphQLEnumType({
    name: 'ReindexLoginTokenType',
    values: {
      AUTH0: {
        description: 'Auth0 access token.',
      },
    },
  });

  const LoginWithAccessTokenInput = new GraphQLInputObjectType({
    name: 'ReindexLoginWithAccessTokenInput',
    fields: {
      accessToken: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'TODO',
      },
      tokenType: {
        type: new GraphQLNonNull(LoginTokenType),
        description: 'TODO',
      },
      clientMutationId: clientMutationIdField,
    },
  });

  const LoginPayload = new GraphQLObjectType({
    name: 'ReindexLoginPayload',
    fields: {
      clientMutationId: clientMutationIdField,
      user: {
        type: typeSets.User.type,
        description: 'The logged-in user.',
      },
      token: {
        type: GraphQLString,
        description: 'An authentication token for the logged-in user.',
      },
    },
  });

  return {
    name: 'loginWithAccessToken',
    description: '',
    type: LoginPayload,
    args: {
      input: {
        type: new GraphQLNonNull(LoginWithAccessTokenInput),
      },
    },
    async resolve(parent, { input }, context) {
      const { db } = context.rootValue;
      const { accessToken, clientMutationId } = input;
      const provider = 'auth0';
      const options = await db.getByField(
        'ReindexAuthenticationProvider',
        'type',
        provider,
      );
      if (!options || !options.isEnabled) {
        throw new GraphQLError('Auth0 provider is disabled. See ' +
          'https://www.reindex.io/docs/security/authentication/' +
          '#social-login-authentication-providers for instructions on how to ' +
          'enable providers.'
        );
      }
      const { domain } = options;
      if (!domain) {
        throw new GraphQLError('Auth0 domain is not set.');
      }
      const response = await fetch(`https://${domain}/userinfo`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new GraphQLError('Fetching the user profile failed.');
      }
      const userInfo = await response.json();
      const user = await getOrCreateUser(db, provider, {
        profile: profile(userInfo),
        token: accessToken,
      });
      // XXX(fson, 2016-02-19): ID needs to be parsed because getOrCreateUser
      // calls the GraphQL endpoint internally.
      user.id = fromReindexID(user.id);

      const token = await signToken(db, { provider, user });

      return {
        clientMutationId,
        user,
        token,
      };
    },
  };
}
