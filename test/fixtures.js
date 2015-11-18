export const TEST_SCHEMA = [
  {
    kind: 'OBJECT',
    name: 'Category',
    interfaces: [],
    fields: [
      {
        name: 'name',
        type: 'String',
      },
    ],
  },
  {
    kind: 'OBJECT',
    name: 'Micropost',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
      {
        name: 'text',
        type: 'String',
      },
      {
        name: 'createdAt',
        type: 'DateTime',
      },
      {
        name: 'author',
        type: 'User',
        reverseName: 'microposts',
      },
      {
        name: 'tags',
        type: 'List',
        ofType: 'String',
      },
      {
        name: 'categories',
        type: 'List',
        ofType: 'Category',
      },
      {
        name: 'mainCategory',
        type: 'Category',
      },
    ],
  },
  {
    kind: 'OBJECT',
    name: 'User',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
      {
        name: 'handle',
        type: 'String',
        unique: true,
      },
      {
        name: 'email',
        type: 'String',
      },
      {
        name: 'microposts',
        type: 'Connection',
        ofType: 'Micropost',
        reverseName: 'author',
        defaultOrdering: {
          field: 'createdAt',
          order: 'ASC',
        },
      },
    ],
  },
];
