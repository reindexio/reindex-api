import getGraphQLContext from '../getGraphQLContext';

import assert from '../../test/assert';

describe('getGraphQLContext', () => {
  const micropostType = {
    id: {
      value: '91ffff68-50ec-403d-9d55-1d1fdc86b335',
      type: 'Micropost',
    },
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
      },
      {
        name: 'favoritedBy',
        type: 'Connection',
        ofType: 'User',
        reverseName: 'favorites',
        grantPermissions: {
          read: true,
        },
      },
    ],
    permissions: [
      {
        path: ['author'],
        read: true,
        create: true,
        update: true,
        delete: true,
      },
    ],
  };
  const userType = {
    id: {
      value: '3992ff9a-637b-4e67-aeee-34b02d9c99ab',
      type: 'User',
    },
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
        ofType: 'Micropost',
        reverseName: 'author',
      },
      {
        name: 'favorites',
        type: 'Connection',
        ofType: 'Micropost',
        reverseName: 'favoritedBy',
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
            type: micropostType.id,
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
            type: micropostType.id,
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
            type: micropostType.id,
            user: {
              type: 'User',
              value: 'user1',
            },
            read: true,
            update: true,
          },
          {
            type: micropostType.id,
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
            path: ['author'],
            read: true,
            create: true,
            update: true,
            delete: true,
          },
          {
            path: ['favoritedBy'],
            read: true,
          },
        ],
        User: [],
      });
    });
  });

  describe('extractHooks', () => {
    it('extracts hooks', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        permissions: [],
        indexes: [],
        hooks: [
          {
            type: null,
            trigger: 'afterCreate',
            url: 'http://example.com',
            fragment: '{ id, foo }',
          },
          {
            type: micropostType.id,
            trigger: 'afterUpdate',
            url: 'http://example.com/micropost',
            fragment: '{ id }',
          },
        ],
      });

      assert.deepEqual(result.hooks, {
        global: {
          afterCreate: [
            {
              type: null,
              trigger: 'afterCreate',
              url: 'http://example.com',
              fragment: '{ id, foo }',
            },
          ],
        },
        Micropost: {
          afterUpdate: [
            {
              type: micropostType,
              trigger: 'afterUpdate',
              url: 'http://example.com/micropost',
              fragment: '{ id }',
            },
          ],
        },
      });
    });
  });
});
