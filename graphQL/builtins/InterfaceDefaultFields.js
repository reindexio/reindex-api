export default function getInterfaceDefaultFields() {
  return {
    Node: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        builtin: true,
      },
    ],
  };
}
