export default function getTypeDefaultFields() {
  return {
    User: [
      {
        name: 'credentials',
        type: 'ReindexCredentialCollection',
        builtin: true,
      },
    ],
  };
}
