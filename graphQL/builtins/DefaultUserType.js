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
  permissions: [
    {
      grantee: 'USER',
      userPath: ['id'],
      read: true,
    },
  ],
};

export default DefaultUserType;
