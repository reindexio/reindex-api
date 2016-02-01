import Path from 'path';
import { capitalize, get } from 'lodash';
import { graphql } from 'graphql';
import Boom from 'boom';
import DoT from 'dot';
import JSONWebToken from 'jsonwebtoken';
import OAuth from 'bell/lib/oauth';
import Providers from 'bell/lib/providers';
import { Set } from 'immutable';

import getGraphQLContext from '../graphQL/getGraphQLContext';
import escapeScriptJSON from './escapeScriptJSON';

const templates = DoT.process({
  path: Path.join(__dirname, 'views'),
});

const COOKIE_NAME = '_reindex_auth';

const WHITELISTED_PROVIDERS = Set([
  'facebook',
  'github',
  'google',
  'twitter',
]);

const LoginErrorCode = {
  LOGIN_CANCELED: 'LOGIN_CANCELED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  UNKNOWN_PROVIDER: 'UNKNOWN_PROVIDER',
};

function getBellProvider(providerName) {
  if (!WHITELISTED_PROVIDERS.has(providerName)) {
    return null;
  }
  return Providers[providerName].call(null);
}

function getBellProviderParams(providerName) {
  if (providerName === 'facebook') {
    return { display: 'popup' };
  }
  return null;
}

function renderCallbackPopup(reply, payload) {
  const html = templates.loginCallbackPopup({
    payload: escapeScriptJSON(JSON.stringify(payload)),
  });
  return reply(html).type('text/html');
}

async function authenticate(request, reply) {
  request.isSocialLoginRequest = true;
  try {
    const db = await request.getDB();
    const providerName = request.params.provider;
    const bellProvider = getBellProvider(providerName);
    if (!bellProvider) {
      return reply(
        Boom.badRequest('Unknown provider', {
          code: LoginErrorCode.UNKNOWN_PROVIDER,
        })
      );
    }

    const authenticationProvider = await db.getByField(
      'ReindexAuthenticationProvider',
      'type',
      providerName,
    );

    if (!authenticationProvider || !authenticationProvider.isEnabled) {
      return reply(
        Boom.badRequest(`Provider '${providerName}' disabled`, {
          code: LoginErrorCode.PROVIDER_DISABLED,
        })
      );
    }

    const { clientId, clientSecret } = authenticationProvider;

    if (!clientId || !clientSecret) {
      return reply(
        Boom.badRequest(`Provider '${providerName}' is not configured`, {
          code: LoginErrorCode.PROVIDER_NOT_CONFIGURED,
        })
      );
    }

    if (request.query.error === 'access_denied' || request.query.denied) {
      return reply(
        Boom.forbidden('Login was canceled by the user', {
          code: LoginErrorCode.LOGIN_CANCELED,
        }
      ));
    }

    const settings = {
      clientId,
      clientSecret,
      cookie: COOKIE_NAME,
      forceHttps: process.env.NODE_ENV === 'production',
      location: false,
      name: providerName,
      provider: bellProvider,
      providerParams: getBellProviderParams(providerName),
      scope: authenticationProvider.scopes,
    };

    return getAuthenticateWithOAuth(settings)(request, reply);
  } catch (error) {
    return reply(error);
  }
}

let simulateOAuthFunction;

function getAuthenticateWithOAuth(settings) {
  if (simulateOAuthFunction) {
    return simulateOAuthFunction(settings);
  } else {
    if (settings.provider.protocol === 'oauth') {
      return OAuth.v1(settings);
    } else {
      return OAuth.v2(settings);
    }
  }
}

function normalizeCredentials(credentials) {
  const { profile } = credentials;
  const result = {
    accessToken: credentials.token,
    displayName: profile.displayName,
    id: profile.id,
  };

  if (profile.email) {  // Facebook, GitHub
    result.email = profile.email;
  } else if (profile.emails) {  // Google
    const accountEmail = profile.emails.find((email) =>
      email.type === 'account'
    );
    result.email = accountEmail.value;
  }

  if (credentials.secret) {
    result.accessTokenSecret = credentials.secret;
  }

  if (profile.username) {
    result.username = profile.username;
  }

  if (profile.raw.profile_image_url_https) {  // Twitter
    result.picture = profile.raw.profile_image_url_https;
  } else if (profile.raw.avatar_url) {  // GitHub
    result.picture = profile.raw.avatar_url;
  } else if (profile.raw.image && profile.raw.image.url) {  // Google
    result.picture = profile.raw.image.url;
  }
  return result;
}


async function handler(request, reply) {
  try {
    const db = await request.getDB();
    const { credentials } = request.auth;

    const { provider } = credentials;
    const credential = normalizeCredentials(credentials);
    const user = await getOrCreateUser(db, provider, credential);

    const secrets = await db.getSecrets();
    if (!secrets.length) {
      throw new Error('We are trying to sign a token but we have no secrets!');
    }

    const token = JSONWebToken.sign(
      { provider },
      secrets[0],
      { subject: user.id },
    );
    return renderCallbackPopup(reply, { token, provider, user });
  } catch (error) {
    return reply(error);
  }
}

async function getOrCreateUser(db, provider, credential) {
  const context = getGraphQLContext(db, await db.getMetadata(), {
    credentials: {
      isAdmin: true,
    },
  });
  const query = `userByCredentials${capitalize(provider)}Id`;

  const userFragment = `
    id
    credentials {
      github {
        id
        accessToken
        displayName
      }
      google {
        id
        accessToken
        displayName
      }
      facebook {
        id
        accessToken
        displayName
      }
      twitter {
        id
        accessToken
        displayName
      }
    }
  `;

  const fetchResult = await graphql(context.schema, `
    query($id: String!) {
      ${query}(id: $id) {
        id
      }
    }
  `, context, {
    id: credential.id,
  });

  if (fetchResult.errors) {
    throw new Error(JSON.stringify(fetchResult.errors));
  }

  let updateResult;
  let updateData;
  if (fetchResult.data && fetchResult.data[query]) {
    const id = fetchResult.data[query].id;
    updateResult = await graphql(context.schema, `
      mutation($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            ${userFragment}
          }
        }
      }
    `, context, {
      input: {
        id,
        credentials: {
          [provider]: credential,
        },
      },
    });
    updateData = get(updateResult, [
      'data',
      'updateUser',
      'changedUser',
    ]);
  } else {
    updateResult = await graphql(context.schema, `
      mutation($input: _CreateUserInput!) {
        createUser(input: $input) {
          changedUser {
            ${userFragment}
          }
        }
      }
    `, context, {
      input: {
        credentials: {
          [provider]: credential,
        },
      },
    });
    updateData = get(updateResult, [
      'data',
      'createUser',
      'changedUser',
    ]);
  }

  if (!updateResult.errors) {
    return updateData;
  } else {
    throw new Error(JSON.stringify(updateResult.errors));
  }
}

function onPreResponse(request, reply) {
  const { response } = request;
  if (request.isSocialLoginRequest && response.isBoom) {
    const code = !response.isServer && response.data && response.data.code;

    const error = code ?
      {
        code,
        message: response.message,
      } :
      {
        code: LoginErrorCode.LOGIN_FAILED,
        message: 'Login failed',
      };

    return renderCallbackPopup(reply, { error });
  }
  return reply.continue();
}

function register(server, options, next) {
  server.state(COOKIE_NAME, {
    encoding: 'iron',
    path: '/',
    password: options.cookiePassword,
    isSecure: server.info.protocol === 'https',
    isHttpOnly: true,
    ignoreErrors: true,
    clearInvalid: true,
  });
  server.auth.scheme('oauth', () => ({ authenticate }));
  server.auth.strategy('social', 'oauth');
  server.route({
    handler: {
      file: 'auth/channel.html',
    },
    method: 'GET',
    path: '/auth/channel',
  });
  server.route({
    config: { auth: 'social' },
    handler,
    method: 'GET',
    path: '/auth/{provider}',
  });
  server.ext('onPreResponse', onPreResponse);
  next();
}

// Modelled after Bell.simulate API
function simulate(oauthFunction) {
  if (oauthFunction) {
    simulateOAuthFunction = oauthFunction;
  } else {
    simulateOAuthFunction = false;
  }
}

register.attributes = {
  name: 'SocialAuthenticationScheme',
};

const SocialAuthenticationScheme = { register, simulate };
export default SocialAuthenticationScheme;
