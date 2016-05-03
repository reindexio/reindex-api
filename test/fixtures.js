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

export const BENCHMARK_SCHEMA = [
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
        name: 'applications',
        type: 'Connection',
        ofType: 'Application',
        reverseName: 'user',
      },
      {
        name: 'screenshots',
        type: 'Connection',
        ofType: 'Screenshot',
        reverseName: 'user',
      },
      {
        name: 'comments',
        type: 'Connection',
        ofType: 'Comment',
        reverseName: 'user',
      },
      {
        name: 'invitedApplications',
        type: 'Connection',
        ofType: 'Application',
        reverseName: 'invitedUsers',
      },
    ],
    permissions: [
      {
        grantee: 'USER',
        userPath: ['id'],
        read: true,
        update: true,
      },
      {
        grantee: 'USER',
        userPath: ['applications', 'invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['invitedApplications', 'user'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['invitedApplications', 'invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['screenshots', 'application', 'user'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['screenshots', 'application', 'invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['comments', 'screenshot', 'application', 'user'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['comments', 'screenshot', 'application', 'invitedUsers'],
        read: true,
      },
    ],
  },
  {
    kind: 'OBJECT',
    name: 'Application',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
      {
        name: 'user',
        type: 'User',
        reverseName: 'applications',
      },
      {
        name: 'screenshots',
        type: 'Connection',
        ofType: 'Screenshot',
        reverseName: 'application',
      },
      {
        name: 'invitedUsers',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'invitedApplications',
      },
    ],
    permissions: [
      {
        grantee: 'USER',
        userPath: ['user'],
        read: true,
        update: true,
        create: true,
        delete: true,
      },
      {
        grantee: 'USER',
        userPath: ['invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['invitedUsers'],
        update: true,
        permittedFields: [
          'screenshots',
        ],
      },
    ],
  },
  {
    kind: 'OBJECT',
    name: 'Screenshot',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
      {
        name: 'user',
        type: 'User',
        reverseName: 'screenshots',
      },
      {
        name: 'application',
        type: 'Application',
        reverseName: 'screenshots',
      },
      {
        name: 'comments',
        type: 'Connection',
        ofType: 'Comment',
        reverseName: 'screenshot',
      },
    ],
    permissions: [
      {
        grantee: 'USER',
        userPath: ['application', 'user'],
        read: true,
        update: true,
        create: true,
        delete: true,
      },
      {
        grantee: 'USER',
        userPath: ['application', 'invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['user'],
        read: true,
        update: true,
        create: true,
        delete: true,
      },
      {
        grantee: 'USER',
        userPath: ['application', 'invitedUsers'],
        update: true,
        permittedFields: ['comments'],
      },
    ],
  },
  {
    kind: 'OBJECT',
    name: 'Comment',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
        unique: true,
      },
      {
        name: 'user',
        type: 'User',
        reverseName: 'comments',
      },
      {
        name: 'screenshot',
        type: 'Screenshot',
        reverseName: 'comments',
      },
    ],
    permissions: [
      {
        grantee: 'USER',
        userPath: ['screenshot', 'application', 'user'],
        read: true,
        update: true,
        create: true,
        delete: true,
      },
      {
        grantee: 'USER',
        userPath: ['screenshot', 'application', 'invitedUsers'],
        read: true,
      },
      {
        grantee: 'USER',
        userPath: ['user'],
        read: true,
        update: true,
        create: true,
        delete: true,
      },
    ],
  },
];
