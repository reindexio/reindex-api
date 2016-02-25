import fetch from 'node-fetch';
import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { GraphQLError } from 'graphql/error';

import clientMutationIdField from '../utilities/clientMutationIdField';
import getOrCreateUser from '../../authentication/getOrCreateUser';
import ProviderType from '../builtins/ProviderType';
import signToken from '../../authentication/signToken';
import { fromReindexID } from '../builtins/ReindexID';
import { profile } from '../../authentication/Auth0Provider';

export default function createLoginWithToken(typeSets) {
  const LoginWithTokenInput = new GraphQLInputObjectType({
    name: 'ReindexLoginWithTokenInput',
    fields: {
      token: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'Token to login with. (Auth0 `id_token`.)',
      },
      provider: {
        type: new GraphQLNonNull(ProviderType),
        description: 'Provider type. (Supported: \'auth0\')',
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
    name: 'loginWithToken',
    description: '',
    type: LoginPayload,
    args: {
      input: {
        type: new GraphQLNonNull(LoginWithTokenInput),
      },
    },
    async resolve(parent, { input }, context) {
      const { db } = context.rootValue;
      const { provider, token, clientMutationId } = input;
      if (provider !== 'auth0') {
        throw new GraphQLError(
          'Login with token is only supported using provider: auth0'
        );
      }
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
      console.log(`https://${domain}/tokeninfo`, token);
      const response = await fetch(`https://${domain}/tokeninfo`, {
        method: 'POST',
        body: JSON.stringify({ id_token: token }),
        headers: {
          'content-type': 'application/json',
        },
      });
      if (response.status < 200 || response.status >= 300) {
        console.error(await response.text());
        throw new GraphQLError('Fetching the user profile failed.');
      }
      const userInfo = await response.json();
      const user = await getOrCreateUser(db, provider, {
        profile: profile(userInfo),
        token,
      });

      const reindexToken = await signToken(db, { provider, user });

      // XXX(fson, 2016-02-19): ID needs to be parsed because getOrCreateUser
      // calls the GraphQL endpoint internally.
      user.id = fromReindexID(user.id);

      return {
        clientMutationId,
        user,
        token: reindexToken,
      };
    },
  };
}
