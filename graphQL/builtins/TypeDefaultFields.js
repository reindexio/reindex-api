export default function getTypeDefaultFields() {
  return {
    User: [
      {
        name: 'credentials',
        description: 'The credentials this user can use to sign in.',
        type: 'ReindexCredentialCollection',
        builtin: true,
      },
      {
        name: 'permissions',
        description: 'The permissions granted to this user.',
        type: 'Connection',
        ofType: 'ReindexPermission',
        reverseName: 'user',
        builtin: true,
      },
    ],
  };
}
