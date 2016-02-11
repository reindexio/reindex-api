export default function getTypeDefaultFields() {
  return {
    User: [
      {
        name: 'credentials',
        description: 'The credentials this user can use to sign in.',
        type: 'ReindexCredentialCollection',
        builtin: true,
        readOnly: true,
      },
    ],
  };
}
