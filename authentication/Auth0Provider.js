export default function Auth0Provider(options) {
  const { domain } = options;
  return {
    protocol: 'oauth2',
    useParamsAuth: true,
    auth: `https://${domain}/authorize`,
    token: `https://${domain}/oauth/token`,
    scope: ['openid', 'name', 'email'],
    profile(credentials, params, get, callback) {
      get(`https://${domain}/userinfo`, null, (rawProfile) => {
        credentials.profile = profile(rawProfile);
        return callback();
      });
    },
  };
}

export function profile(raw) {
  return {
    displayName: raw.name,
    email: raw.email,
    id: raw.user_id,
    picture: raw.picture,
    raw,
  };
}
