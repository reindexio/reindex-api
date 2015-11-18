import assert from '../../../test/assert';
import hasPermission from '../hasPermission';

describe('hasPermission', () => {
  function testPermission(
    credentials,
    type,
    permission,
    typePermissions = {},
    object = {},
    connectionPermissions = {},
  ) {
    return hasPermission(type, permission, object, {
      rootValue: {
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

    it('can do anything', () => {
      assert.equal(testPermission(credentials, 'Post', 'read'), true);
      assert.equal(testPermission(credentials, 'Post', 'update'), true);
      assert.equal(testPermission(credentials, 'Post', 'delete'), true);
      assert.equal(testPermission(credentials, 'Post', 'create'), true);
    });

    it('can do stuff even if banned from doing so by permissions', () => {
      assert.equal(testPermission(credentials, 'Post', 'delete', {
        Post: {
          'some-user-id': {
            delete: false,
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

    it('can only read and delete', () => {
      assert.equal(testPermission(credentials, 'User', 'read', {}, {
        id,
      }), true);
      assert.equal(testPermission(credentials, 'User', 'update', {}, {
        id,
      }), false);
      assert.equal(testPermission(credentials, 'User', 'delete', {}, {
        id,
      }), true);
      assert.equal(testPermission(credentials, 'User', 'create', {}, {
        id,
      }), false);
    });

    it('can do stuff even if banned from doing so by permissions', () => {
      assert.equal(testPermission(credentials, 'User', 'read', {
        User: {
          'some-user-id': {
            read: false,
          },
        },
      }, {
        id,
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
    const typePermissions = {
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
    };

    it('can do stuff allowed by permissions', () => {
      assert.equal(
        testPermission(credentials, 'Post', 'read', typePermissions),
        true
      );
    });

    it('everything not allowed is banned by default', () => {
      assert.equal(
        testPermission(credentials, 'Post', 'update', typePermissions),
        false
      );
      assert.equal(
        testPermission(anonymousCredentials, 'Post', 'read', typePermissions),
        false
      );
    });

    it('anonymous user can have permissions too', () => {
      assert.equal(
        testPermission(credentials, 'Comment', 'read', typePermissions),
        false
      );
    });

    it('individual ban permissions trump general ones', () => {
      assert.equal(testPermission(
        anonymousCredentials, 'Comment', 'read', typePermissions
      ), true);
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
          name: 'author',
          grantPermissions: {
            read: true,
          },
        },
      ],
    };

    it('can read own stuff', () => {
      assert.equal(testPermission(credentials, 'Post', 'read', {}, {
        author: id,
      }, connectionPermissions), true);
    });

    it('can not read other stuff', () => {
      assert.equal(testPermission(credentials, 'Post', 'read', {}, {
        author: {
          type: 'User',
          value: 'some-other-id',
        },
      }, connectionPermissions), false);
    });
  });
});
