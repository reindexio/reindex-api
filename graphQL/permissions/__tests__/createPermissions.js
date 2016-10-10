import createDefaultTypeRegistry from '../../createDefaultTypeRegistry';
import assert from '../../../test/assert';
import {
  extractTypePermissions,
  extractConnectionPermissions,
  extractRelatedPermissions,
} from '../createPermissions';

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

describe('extractTypePermissions', () => {
  it('applies wildcard permissions to type with no permissions', () => {
    const typeRegistry = createDefaultTypeRegistry({ types: testTypes });

    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('Micropost')),
      {},
    );

    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('User')),
      {
        EVERYONE: {
          grantee: 'EVERYONE',
          userPath: null,
          read: true,
          update: true,
          create: true,
          delete: true,
          permittedFields: ['id', 'microposts', 'favorites'],
        },
      },
    );
  });

  it('extracts type permissions', () => {
    const typeRegistry = createDefaultTypeRegistry({
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
    });

    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('Micropost')),
      {},
    );
    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('User')),
      {
        AUTHENTICATED: {
          grantee: 'AUTHENTICATED',
          userPath: null,
          read: true,
          update: true,
          create: true,
          delete: true,
          permittedFields: ['id', 'microposts', 'favorites'],
        },
        EVERYONE: {
          grantee: 'EVERYONE',
          userPath: null,
          read: true,
          update: false,
          create: false,
          delete: false,
          permittedFields: ['id', 'microposts', 'favorites'],
        },
      },
    );
  });

  it('combines permissions correctly', () => {
    const typeRegistry = createDefaultTypeRegistry({
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
    });

    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('Micropost')),
      {},
    );
    assert.deepEqual(
      extractTypePermissions(typeRegistry.getTypeSet('User')),
      {
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
    );
  });
});

describe('extractConnectionPermissions', () => {
  it('extracts connection permissions', () => {
    const typeRegistry = createDefaultTypeRegistry({ types: testTypes });
    const result = extractConnectionPermissions(
      typeRegistry.getTypeSet('Micropost'),
      typeRegistry,
    );
    assert.deepEqual(result, [
      {
        grantee: 'USER',
        userPath: ['author'],
        path: [
          {
            name: 'author',
            type: 'User',
            connectionType: 'ONE_TO_MANY',
            reverseName: 'microposts',
          },
        ],
        read: true,
        create: true,
        update: true,
        delete: true,
        permittedFields: ['id', 'author', 'favoritedBy'],
      },
      {
        grantee: 'USER',
        userPath: ['favoritedBy'],
        path: [
          {
            name: 'favoritedBy',
            type: 'User',
            connectionType: 'MANY_TO_MANY',
            reverseName: 'favorites',

          },
        ],
        read: true,
        create: false,
        update: false,
        delete: false,
        permittedFields: ['id', 'author', 'favoritedBy'],
      },
    ]);
  });
});

describe('extractRelatedPermissions', () => {
  it('extracts related permissions', () => {
    const typeRegistry = createDefaultTypeRegistry({ types: testTypes });

    assert.deepEqual(
      extractRelatedPermissions(typeRegistry.getTypeSet('Micropost')),
      [
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
    );

    assert.deepEqual(
      extractRelatedPermissions(typeRegistry.getTypeSet('User')),
      [
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
    );
  });
});
