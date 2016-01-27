import Boom from 'boom';
import JSONWebToken from 'jsonwebtoken';

import Monitoring from '../Monitoring';
import { fromReindexID } from '../graphQL/builtins/ReindexID';

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

async function authenticateAsync(request) {
  const hostname = request.info.hostname;
  const { authorization } = request.headers;

  if (!authorization) {
    return {
      hostname,
      isAdmin: false,
      userID: null,
    };
  }

  const match = authorizationRegExp.exec(authorization);
  if (!match) {
    throw Boom.unauthorized();
  }
  const token = match[1];

  const db = await request.getDB();

  let secrets;
  try {
    secrets = await db.getSecrets();
  } catch (error) {
    Monitoring.noticeError(error);
    throw error;
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

  let userID = null;
  if (verifiedToken.sub) {
    userID = fromReindexID(verifiedToken.sub);
    if (!db.isValidID('User', userID)) {
      throw Boom.unauthorized();
    }
  }

  const credentials = {
    hostname,
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
    if (error.isBoom && error.output.statusCode === 401) {
      Monitoring.setIgnoreTransaction(true);
    }
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
