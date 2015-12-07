const DefaultUserType = {
  name: 'User',
  fields: [
    {
      name: 'id',
      type: 'ID',
      nonNull: true,
      unique: true,
    },
  ],
  kind: 'OBJECT',
  interfaces: ['Node'],
};

export default DefaultUserType;
