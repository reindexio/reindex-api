import { get, chain, indexBy } from 'lodash';

import assert from '../../../test/assert';
import hasPermission from '../hasPermission';

describe('hasPermission', () => {
  function testPermission(
    credentials,
    type,
    permission,
    {
      db = {},
      typePermissions = {},
      object = {},
      connectionPermissions = {},
    } = {},
  ) {
    return hasPermission(type, permission, object, {
      rootValue: {
        db,
        credentials,
        permissions: {
          type: typePermissions,
          connection: connectionPermissions,
        },
      },
    });
  }

  describe('user is admin', () => {
    const credentials = {
      isAdmin: true,
      userID: {
        type: 'User',
        value: 'some-user-id',
      },
    };

    it('can do anything', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'read'), true);
      assert.equal(await testPermission(credentials, 'Post', 'update'), true);
      assert.equal(await testPermission(credentials, 'Post', 'delete'), true);
      assert.equal(await testPermission(credentials, 'Post', 'create'), true);
    });

    it('can do stuff even if banned from doing so by permissions', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'delete', {
        typePermissions: {
          Post: {
            'some-user-id': {
              delete: false,
            },
          },
        },
      }), true);
    });
  });

  describe('user does stuff to himself', () => {
    const id = {
      type: 'User',
      value: 'some-user-id',
    };

    const credentials = {
      isAdmin: false,
      userID: id,
    };

    it('can only read and delete', async () => {
      assert.equal(await testPermission(credentials, 'User', 'read', {
        object: {
          id,
        },
      }), true);
      assert.equal(await testPermission(credentials, 'User', 'update', {
        object: {
          id,
        },
      }), false);
      assert.equal(await testPermission(credentials, 'User', 'delete', {
        object: {
          id,
        },
      }), true);
      assert.equal(await testPermission(credentials, 'User', 'create', {
        object: {
          id,
        },
      }), false);
    });

    it('can do stuff even if banned from doing so by permissions', async () => {
      assert.equal(await testPermission(credentials, 'User', 'read', {
        typePermissions: {
          User: {
            'some-user-id': {
              read: false,
            },
          },
        },
        object: {
          id,
        },
      }), true);
    });
  });

  describe('user has type permissions', () => {
    const credentials = {
      isAdmin: false,
      userID: {
        value: 'some-user-id',
        type: 'User',
      },
    };
    const anonymousCredentials = {
      isAdmin: false,
      userID: null,
    };
    const options = {
      typePermissions: {
        Post: {
          'some-user-id': {
            read: true,
          },
        },
        Comment: {
          'some-user-id': {
            read: false,
          },
          anonymous: {
            read: true,
          },
        },
      },
    };

    it('can do stuff allowed by permissions', async () => {
      assert.equal(
        await testPermission(credentials, 'Post', 'read', options),
        true
      );
    });

    it('everything not allowed is banned by default', async () => {
      assert.equal(
        await testPermission(credentials, 'Post', 'update', options),
        false
      );
      assert.equal(
        await testPermission(anonymousCredentials, 'Post', 'read', options),
        false
      );
    });

    it('anonymous user can have permissions too', async () => {
      assert.equal(
        await testPermission(credentials, 'Comment', 'read', options),
        false
      );
    });

    it('individual ban permissions trump general ones', async () => {
      assert.equal(
        await testPermission(anonymousCredentials, 'Comment', 'read', options),
        true
      );
    });
  });

  describe('user has connection permissions', () => {
    const id = {
      type: 'User',
      value: 'some-user-id',
    };
    const credentials = {
      isAdmin: false,
      userID: id,
    };
    const connectionPermissions = {
      Post: [
        {
          path: ['author'],
          read: true,
        },
        {
          path: ['editors'],
          update: true,
        },
        {
          path: ['author', 'supervisor'],
          update: true,
        },
      ],
    };


    class MockDB {
      constructor(objects) {
        this.objects = chain(objects)
          .groupBy((object) => object.type)
          .mapValues((typeObjects) => indexBy(
            typeObjects,
            (object) => object.id)
          )
          .value();
      }

      getByID(type, value) {
        return Promise.resolve(get(this.objects, [type, value.value]));
      }
    }

    const db = new MockDB([
      {
        id: 'some-supervised-id',
        type: 'User',
        supervisor: {
          type: 'User',
          value: 'some-user-id',
        },
      },
    ]);

    const options = {
      db,
      connectionPermissions,
    };

    it('can read own stuff', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'read', {
        ...options,
        object: {
          author: id,
        },
      }), true);
    });

    it('can not read other stuff', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'read', {
        ...options,
        object: {
          author: {
            type: 'User',
            value: 'some-other-id',
          },
        },
      }), false);
    });

    it('can write if an editor', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'update', {
        ...options,
        object: {
          author: {
            type: 'User',
            value: 'some-other-id',
          },
          editors: [
            id,
          ],
        },
      }, connectionPermissions), true);
    });

    it('can write if supervisor', async () => {
      assert.equal(await testPermission(credentials, 'Post', 'update', {
        ...options,
        object: {
          author: {
            type: 'User',
            value: 'some-supervised-id',
          },
        },
      }), true);
    });
  });
});
