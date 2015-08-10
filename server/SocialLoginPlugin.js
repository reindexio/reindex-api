import Path from 'path';

import Boom from 'boom';
import DoT from 'dot';
import JSONWebToken from 'jsonwebtoken';
import OAuth from 'bell/lib/oauth';
import Providers from 'bell/lib/providers';
import {Set} from 'immutable';

import escapeScriptJSON from './escapeScriptJSON';
import toJSON from './toJSON';
import {
  getAuthenticationProvider,
  getOrCreateUser,
  getSecrets,
} from '../db/queries';

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
    payload: escapeScriptJSON(toJSON(payload)),
  });
  return reply(html).type('text/html');
}

async function authenticate(request, reply) {
  request.isSocialLoginRequest = true;
  try {
    const conn = await request.rethinkDBConnection;
    const providerName = request.params.provider;
    const bellProvider = getBellProvider(providerName);
    if (!bellProvider) {
      return reply(
        Boom.badRequest('Unknown provider', {
          code: LoginErrorCode.UNKNOWN_PROVIDER,
        })
      );
    }

    const authenticationProvider = await getAuthenticationProvider(
      conn,
      providerName,
    );

    if (!authenticationProvider || !authenticationProvider.isEnabled) {
      return reply(
        Boom.badRequest(`Provider '${providerName}' disabled`, {
          code: LoginErrorCode.PROVIDER_DISABLED,
        })
      );
    }

    const {clientID, clientSecret} = authenticationProvider;

    if (!clientID || !clientSecret) {
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
      clientId: clientID,
      clientSecret,
      cookie: COOKIE_NAME,
      forceHttps: false,
      location: false,
      name: providerName,
      provider: bellProvider,
      providerParams: getBellProviderParams(providerName),
    };

    const authenticateWithOAuth = settings.provider.protocol === 'oauth' ?
      OAuth.v1(settings) :
      OAuth.v2(settings);

    return authenticateWithOAuth(request, reply);
  } catch (error) {
    return reply(error);
  }
}

function normalizeCredentials(credentials) {
  const {profile} = credentials;
  const result = {
    accessToken: credentials.token,
    displayName: profile.displayName,
    id: profile.id,
  };

  if (profile.email) {
    result.email = profile.email;
  }
  if (credentials.secret) {
    result.accessTokenSecret = credentials.secret;
  }
  if (profile.username) {
    result.username = profile.username;
  }
  return result;
}


async function handler(request, reply) {
  try {
    const conn = await request.rethinkDBConnection;
    const {credentials} = request.auth;

    const {provider} = credentials;
    const credential = normalizeCredentials(credentials);
    const user = await getOrCreateUser(
      conn,
      provider,
      credential,
    );

    const secrets = await getSecrets(conn);
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

function onPreResponse(request, reply) {
  const {response} = request;
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

register.attributes = {
  name: 'SocialAuthenticationScheme',
};

const SocialAuthenticationScheme = { register };
export default SocialAuthenticationScheme;
