import Boom from 'boom';
import JSONWebToken from 'jsonwebtoken';

const authorizationRegExp = /^Bearer (.+)$/i;

function verifyToken(token, secrets) {
  for (const secret of secrets) {
    try {
      const result = JSONWebToken.verify(token, secret, {
        algorithms: ['HS256'],
      });
      return result;
    } catch (error) {
      if (error.message !== 'invalid signature') {
        throw error;
      }
    }
  }
  return null;
}

function authenticate(request, reply) {
  const { tenant } = request;
  const { req } = request.raw;
  const { authorization } = request.headers;

  if (!authorization) {
    return reply(Boom.unauthorized());
  }

  const match = authorizationRegExp.exec(authorization);
  if (!match) {
    return reply(Boom.unauthorized());
  }
  const token = match[1];

  let verifiedToken;
  try {
    verifiedToken = verifyToken(token, tenant.secrets);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return reply(Boom.unauthorized('Token expired'));
    } else {
      return reply(Boom.unauthorized());
    }
  }

  if (!verifiedToken) {
    return reply(Boom.unauthorized());
  }

  const credentials = {
    isAdmin: verifiedToken.admin === true,
    userID: verifiedToken.sub,
  };

  return reply.continue({ credentials });
}

function register(server, options, next) {
  server.auth.scheme('jwt', () => ({ authenticate }));
  next();
}

register.attributes = {
  name: 'JWTAuthenticationScheme',
};

export default { register };
