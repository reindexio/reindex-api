import Path from 'path';
import Boom from 'boom';
import DoT from 'dot';
import OAuth from 'bell/lib/oauth';
import Providers from 'bell/lib/providers';

import Auth0Provider from '../authentication/Auth0Provider';
import getOrCreateUser from '../authentication/getOrCreateUser';
import escapeScriptJSON from './escapeScriptJSON';
import signToken from '../authentication/signToken';

const templates = DoT.process({
  path: Path.join(__dirname, 'views'),
});

const COOKIE_NAME = '_reindex_auth';

const LoginErrorCode = {
  LOGIN_CANCELED: 'LOGIN_CANCELED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  UNKNOWN_PROVIDER: 'UNKNOWN_PROVIDER',
};

export function getBellProvider(providerName) {
  switch (providerName) {
    case 'auth0': return Auth0Provider;
    case 'facebook': return Providers.facebook;
    case 'github': return Providers.github;
    case 'google': return Providers.google;
    case 'twitter': return Providers.twitter;
    default: return null;
  }
}

export function getBellProviderParams(providerName) {
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
      provider: bellProvider(authenticationProvider),
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

async function handler(request, reply) {
  try {
    const db = await request.getDB();
    const { credentials } = request.auth;

    const { provider } = credentials;
    const user = await getOrCreateUser(db, provider, credentials);
    const token = await signToken(db, { provider, user });

    return renderCallbackPopup(reply, { token, provider, user });
  } catch (error) {
    return reply(error);
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
export function simulate(oauthFunction) {
  if (oauthFunction) {
    simulateOAuthFunction = oauthFunction;
  } else {
    simulateOAuthFunction = false;
  }
}

register.attributes = {
  name: 'SocialAuthenticationScheme',
};

const SocialAuthenticationScheme = { register };
export default SocialAuthenticationScheme;
