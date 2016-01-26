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
        grantee: 'USER',
        userPath: ['author'],
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
    it('applies wildcard permissions to type with no permissions', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
      });

      assert.deepEqual(result.permissions.type, {
        Micropost: {
        },
        User: {
          EVERYONE: {
            grantee: 'EVERYONE',
            userPath: null,
            read: true,
            update: true,
            create: true,
            delete: true,
            permittedFields: null,
          },
        },
      });
    });

    it('extracts type permissions', () => {
      const result = getGraphQLContext(null, {
        types: [
          micropostType,
          {
            ...userType,
            permissions: [
              {
                grantee: 'EVERYONE',
                read: true,
              },
              {
                grantee: 'AUTHENTICATED',
                read: true,
                update: true,
                create: true,
                delete: true,
              },
            ],
          },
        ],
        indexes: [],
      });

      assert.deepEqual(result.permissions.type, {
        Micropost: {
        },
        User: {
          AUTHENTICATED: {
            grantee: 'AUTHENTICATED',
            userPath: null,
            read: true,
            update: true,
            create: true,
            delete: true,
            permittedFields: null,
          },
          EVERYONE: {
            grantee: 'EVERYONE',
            userPath: null,
            read: true,
            update: false,
            create: false,
            delete: false,
            permittedFields: null,
          },
        },
      });
    });

    it('combines permissions correctly', () => {
      const result = getGraphQLContext(null, {
        types: [
          micropostType,
          {
            ...userType,
            permissions: [
              {
                grantee: 'AUTHENTICATED',
                read: true,
                update: true,
                permittedFields: ['someOtherField'],
              },
              {
                grantee: 'AUTHENTICATED',
                create: true,
                delete: true,
                permittedFields: ['someField'],
              },
            ],
          },
        ],
        indexes: [],
      });

      assert.deepEqual(result.permissions.type, {
        Micropost: {},
        User: {
          AUTHENTICATED: {
            grantee: 'AUTHENTICATED',
            userPath: null,
            read: true,
            update: true,
            create: true,
            delete: true,
            permittedFields: ['someOtherField', 'someField'],
          },
        },
      });
    });
  });

  describe('extractConnectionPermissions', () => {
    it('extracts connection permissions', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
      });

      assert.deepEqual(result.permissions.connection, {
        Micropost: [
          {
            grantee: 'USER',
            userPath: ['author'],
            read: true,
            create: true,
            update: true,
            delete: true,
            permittedFields: null,
            connectionType: 'MANY_TO_ONE',
            reverseName: 'microposts',
          },
          {
            grantee: 'USER',
            userPath: ['favoritedBy'],
            read: true,
            create: false,
            update: false,
            delete: false,
            permittedFields: null,
            connectionType: 'MANY_TO_MANY',
            reverseName: 'favorites',
          },
        ],
        User: [],
      });
    });
  });

  describe('extractRelatedPermissions', () => {
    it('extracts related permissions', () => {
      const result = getGraphQLContext(null, {
        types: testTypes,
        indexes: [],
      });

      assert.deepEqual(result.permissions.related, {
        Micropost: [
          {
            type: 'User',
            name: 'author',
            reverseName: 'microposts',
            connectionType: 'ONE_TO_MANY',
          },
          {
            name: 'favoritedBy',
            reverseName: 'favorites',
            type: 'User',
            connectionType: 'MANY_TO_MANY',
          },
        ],
        User: [
          {
            name: 'microposts',
            type: 'Micropost',
            reverseName: 'author',
            connectionType: 'MANY_TO_ONE',
          },
          {
            name: 'favorites',
            reverseName: 'favoritedBy',
            type: 'Micropost',
            connectionType: 'MANY_TO_MANY',
          },
        ],
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
