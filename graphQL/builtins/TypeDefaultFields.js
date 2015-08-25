export default function getTypeDefaultFields() {
  return {
    User: [
      {
        name: 'credentials',
        type: 'ReindexCredentialCollection',
        builtin: true,
      },
      {
        name: 'permissions',
        type: 'Connection',
        ofType: 'ReindexPermission',
        reverseName: 'user',
        builtin: true,
      },
    ],
  };
}
