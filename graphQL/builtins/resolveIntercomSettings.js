import Crypto from 'crypto';

import Config from '../../server/Config';

const { appId, secretKey } = Config.get('Intercom');

function getAdminUserId(hostname) {
  return `admin@${hostname}`;
}

export default function resolveIntercomSettings(parent, args, context) {
  const { hostname, isAdmin } = context.rootValue.credentials;
  if (!isAdmin || !appId || !secretKey) {
    return null;
  }
  const userId = getAdminUserId(hostname);
  const userHash = Crypto.createHmac('sha256', secretKey).update(userId)
    .digest('hex');
  return {
    appId,
    userId,
    userHash,
  };
}
