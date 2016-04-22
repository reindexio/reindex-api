export const TEST_SCHEMA = [
  {
    kind: 'OBJECT',
    name: 'Category',
    interfaces: [],
    fields: [
      {
        name: 'name',
        type: 'String',
        orderable: true,
        filterable: true,
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
        orderable: true,
      },
      {
        name: 'createdAt',
        type: 'DateTime',
        orderable: true,
        filterable: true,
      },
      {
        name: 'author',
        type: 'User',
        reverseName: 'microposts',
      },
      {
        name: 'favoritedBy',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'favorites',
      },
      {
        name: 'tags',
        type: 'List',
        ofType: 'String',
        filterable: true,
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
        orderable: true,
        filterable: true,
      },
      {
        name: 'email',
        type: 'String',
        filterable: true,
      },
      {
        name: 'friends',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'friends',
      },
      {
        name: 'following',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'followers',
      },
      {
        name: 'followers',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'following',
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
      {
        name: 'favorites',
        type: 'Connection',
        ofType: 'Micropost',
        reverseName: 'favoritedBy',
      },
    ],
  },
];
