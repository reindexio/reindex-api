import Crypto from 'crypto';

import Config from '../../server/Config';

const { appId, secretKey } = Config.get('Intercom');

export function getAdminUserId(hostname) {
  return `admin@${hostname}`;
}

export function getIntercomSettings(credentials) {
  const { hostname, isAdmin } = credentials;
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
