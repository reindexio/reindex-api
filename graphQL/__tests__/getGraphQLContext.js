import getGraphQLContext from '../getGraphQLContext';

import assert from '../../test/assert';

describe('getGraphQLContext', () => {
  const micropostType = {
    id: '91ffff68-50ec-403d-9d55-1d1fdc86b335',
    name: 'Micropost',
    kind: 'OBJECT',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
      },
      {
        name: 'author',
        type: 'User',
        reverseName: 'microposts',
        grantPermissions: {
          read: true,
        },
      },
    ],
  };
  const userType = {
    id: '3992ff9a-637b-4e67-aeee-34b02d9c99ab',
    name: 'User',
    kind: 'OBJECT',
    interfaces: ['Node'],
    fields: [
      {
        name: 'id',
        type: 'ID',
        nonNull: true,
      },
      {
        name: 'microposts',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'author',
      },
    ],
  };
  const testTypes = [micropostType, userType];

  describe('extractIndexes', () => {
    it('extracts indexes', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        permissions: [],
        indexes: [
          {
            type: 'Micropost',
            name: 'test1',
            fields: ['author', 'value'],
          },
          {
            type: 'Micropost',
            name: 'test2',
            fields: ['id'],
          },
          {
            type: 'User',
            name: 'test3',
            fields: ['id'],
          },
        ],
      });

      assert.deepEqual(result.indexes, {
        Micropost: [
          {
            type: 'Micropost',
            name: 'test1',
            fields: ['author', 'value'],
          },
          {
            type: 'Micropost',
            name: 'test2',
            fields: ['id'],
          },
        ],
        User: [
          {
            type: 'User',
            name: 'test3',
            fields: ['id'],
          },
        ],
      });
    });
  });

  describe('extractPermissions', () => {
    it('applies wildcard permissions to all types', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
        permissions: [
          {
            type: {
              type: 'ReindexType',
              value: micropostType.id,
            },
            user: null,
            read: true,
          },
          {
            type: null,
            user: null,
            update: true,
          },
        ],
      });

      assert.deepEqual(result.permissions.type, {
        Micropost: {
          anonymous: {
            read: true,
            update: true,
            create: undefined,
            delete: undefined,
          },
        },
        User: {
          anonymous: {
            update: true,
            read: undefined,
            create: undefined,
            delete: undefined,
          },
        },
      });
    });

    it('extracts type specific permissions per user', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
        permissions: [
          {
            type: {
              type: 'ReindexType',
              value: micropostType.id,
            },
            user: {
              type: 'User',
              value: 'user1',
            },
            read: true,
          },
          {
            type: null,
            user: {
              type: 'User',
              value: 'user1',
            },
            update: true,
          },
        ],
      });

      assert.deepEqual(result.permissions.type, {
        Micropost: {
          user1: {
            read: true,
            update: true,
            create: undefined,
            delete: undefined,
          },
        },
        User: {
          user1: {
            update: true,
            read: undefined,
            create: undefined,
            delete: undefined,
          },
        },
      });
    });

    it('combines permissions correctly', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
        permissions: [
          {
            type: {
              type: 'ReindexType',
              value: micropostType.id,
            },
            user: {
              type: 'User',
              value: 'user1',
            },
            read: true,
            update: true,
          },
          {
            type: {
              type: 'ReindexType',
              value: micropostType.id,
            },
            user: {
              type: 'User',
              value: 'user1',
            },
            update: false,
            create: false,
          },
        ],
      });


      assert.deepEqual(result.permissions.type, {
        Micropost: {
          user1: {
            read: true,
            update: false,
            create: false,
            delete: undefined,
          },
        },
        User: {},
      });
    });
  });

  describe('extractConnectionPermissions', () => {
    it('extracts connection permissions', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        permissions: [],
        indexes: [],
      });

      assert.deepEqual(result.permissions.connection, {
        Micropost: [
          {
            grantPermissions: {
              read: true,
            },
            name: 'author',
            reverseName: 'microposts',
            type: 'User',
          },
        ],
        User: [],
      });
    });
  });
});
