import Boom from 'boom';
import JSONWebToken from 'jsonwebtoken';

import { fromReindexID } from '../graphQL/builtins/ReindexID';
import { getSecrets } from '../db/queries/simpleQueries';

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
  const { authorization } = request.headers;

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

  const userID = verifiedToken.sub ?
    fromReindexID(verifiedToken.sub).value :
    null;

  const credentials = {
    isAdmin: verifiedToken.isAdmin === true,
    userID,
  };

  return credentials;
}

async function authenticate(request, reply) {
  try {
    const credentials = await authenticateAsync(request);
    return reply.continue({ credentials });
  } catch (error) {
    return reply(error);
  }
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
