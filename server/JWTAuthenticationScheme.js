import Boom from 'boom';
import JSONWebToken from 'jsonwebtoken';

import {getSecrets} from '../db/queries';

const authorizationRegExp = /^Bearer (.+)$/i;
const databaseDoesNotExistRegExp = /^Database `[^`]+` does not exist.$/;

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

async function authenticateAsync(request) {
  const {authorization} = request.headers;

  if (!authorization) {
    return {
      isAdmin: false,
      userID: null,
    };
  }

  const match = authorizationRegExp.exec(authorization);
  if (!match) {
    throw Boom.unauthorized();
  }
  const token = match[1];

  const conn = await request.rethinkDBConnection;

  let secrets;
  try {
    secrets = await getSecrets(conn);
  } catch (error) {
    if (error.name === 'ReqlOpFailedError' &&
        databaseDoesNotExistRegExp.test(error.msg)) {
      throw Boom.notFound();
    } else {
      throw error;
    }
  }

  let verifiedToken;
  try {
    verifiedToken = verifyToken(token, secrets);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw Boom.unauthorized('Token expired');
    } else {
      throw Boom.unauthorized();
    }
  }

  if (!verifiedToken) {
    throw Boom.unauthorized();
  }

  const credentials = {
    isAdmin: verifiedToken.admin === true,
    userID: verifiedToken.sub,
  };

  return credentials;
}

function authenticate(request, reply) {
  authenticateAsync(request)
    .then((credentials) => reply.continue({ credentials }))
    .catch((error) => reply(error));
}

function register(server, options, next) {
  server.auth.scheme('jwt', () => ({ authenticate }));
  next();
}

register.attributes = {
  name: 'JWTAuthenticationScheme',
};

const JWTAuthenticationScheme = { register };
export default JWTAuthenticationScheme;
