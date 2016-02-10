import {
  get, chain, indexBy, zip, some, every, isEqual, isArray,
} from 'lodash';

import assert from '../../../test/assert';
import hasPermission from '../hasPermission';

describe('hasPermission', () => {
  class MockDB {
    constructor(objects) {
      this.objects = chain(objects)
        .groupBy((object) => object.id.type)
        .mapValues((typeObjects) => indexBy(
          typeObjects,
          (object) => object.id.value)
        )
        .value();
    }

    getByID(type, value) {
      return Promise.resolve(get(this.objects, [type, value.value]));
    }

    getAllByFilter(type, filter) {
      return Promise.resolve(Object.values(this.objects[type]).filter(
        (object) => every(filter, (value, key) => {
          const objectValue = object[key];
          if (isArray(objectValue)) {
            return some(objectValue, (oneValue) => isEqual(oneValue, value));
          } else {
            return isEqual(objectValue, value);
          }
        })
      ));
    }

    hasByFilter(type, filter) {
      return Promise.resolve(some(this.objects[type], (object) =>
        every(filter, (value, key) => isEqual(object[key], value))
      ));
    }
  }

  async function testPermission(
    credentials,
    type,
    permission,
    oldObject = {},
    newObject = {},
    {
      db = {},
      typePermissions = {},
      connectionPermissions = {},
      relatedPermissions = {},
    } = {},
  ) {
    return (await hasPermission(type, permission, oldObject, newObject, {
      rootValue: {
        db,
        credentials,
        permissions: {
          type: typePermissions,
          connection: connectionPermissions,
          related: relatedPermissions,
        },
      },
    })).hasPermission;
  }

  describe('user is admin', () => {
    it('can do anything', async () => {
      const credentials = {
        isAdmin: true,
        userID: null,
      };

      assert.equal(await testPermission(credentials, 'Post', 'read'), true);
      assert.equal(await testPermission(credentials, 'Post', 'update'), true);
      assert.equal(await testPermission(credentials, 'Post', 'delete'), true);
      assert.equal(await testPermission(credentials, 'Post', 'create'), true);
    });
  });

  // simple type permission grants
  describe('simple permissions', () => {
    const anonymousCredentials = {
      isAdmin: false,
      userID: null,
    };
    const userID = {
      type: 'User',
      value: 'user-id',
    };
    const teamMate1ID = {
      type: 'User',
      value: 'team-mate1-id',
    };
    const teamMate2ID = {
      type: 'User',
      value: 'team-mate2-id',
    };
    const teamID = {
      type: 'Team',
      value: 'team-id',
    };
    const teamSupervisorID = {
      type: 'User',
      value: 'team-supervisor-id',
    };
    const supervisorID = {
      type: 'User',
      value: 'supervisor-id',
    };
    const supervisorSupervisorID = {
      type: 'User',
      value: 'supervisor-supervisor-id',
    };
    const strangerID = {
      type: 'User',
      value: 'stranger-id',
    };

    const userCredentials = {
      isAdmin: false,
      userID,
    };
    const teamMate1Credentials = {
      isAdmin: false,
      userID: teamMate1ID,
    };
    const supervisorCredentials = {
      isAdmin: false,
      userID: supervisorID,
    };
    const supervisorSupervisorCredentials = {
      isAdmin: false,
      userID: supervisorSupervisorID,
    };
    const teamSupervisorCredentials = {
      isAdmin: false,
      userID: teamSupervisorID,
    };
    const strangerCredentials = {
      isAdmin: false,
      userID: strangerID,
    };

    const user = {
      id: userID,
      teams: [
        teamID,
      ],
      supervisor: supervisorID,
      evalution: 'Good',
      fired: false,
    };
    const teamMate1 = {
      id: teamMate1ID,
      teams: [
        teamID,
      ],
    };
    const teamMate2 = {
      id: teamMate2ID,
      teams: [
        teamID,
      ],
    };
    const team = {
      id: teamID,
      members: [
        userID,
        teamMate1ID,
        teamMate2ID,
        supervisorID,
      ],
      supervisor: teamSupervisorID,
    };
    const supervisor = {
      id: supervisorID,
      supervisor: supervisorSupervisorID,
      teams: [
        teamID,
      ],
    };

    const options = {
      db: new MockDB([
        user,
        supervisor,
        team,
        teamMate1,
        teamMate2,
      ]),
      typePermissions: {
        User: {
          EVERYONE: {
            read: true,
          },
          AUTHENTICATED: {
            create: true,
          },
        },
      },
      connectionPermissions: {
        User: [
          {
            userPath: ['id'],
            path: [
              {
                name: 'id',
                type: 'User',
                connectionType: 'ITSELF',
                reverseName: undefined,
              },
            ],
            delete: true,

          },
          {
            userPath: ['supervisor'],
            path: [
              {
                name: 'supervisor',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'supervises',
              },
            ],
            update: true,
            permittedFields: ['fired'],
          },
          {
            userPath: ['supervisor', 'supervisor'],
            path: [
              {
                name: 'supervisor',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'supervises',
              },
              {
                name: 'supervisor',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'supervises',
              },
            ],
            delete: true,
          },
          {
            userPath: ['teams', 'supervisor'],
            path: [
              {
                name: 'team',
                type: 'Team',
                connectionType: 'MANY_TO_MANY',
                reverseName: 'members',
              },
              {
                name: 'supervisor',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'supervises',
              },
            ],
            delete: true,
          },
          {
            userPath: ['team', 'members'],
            path: [
              {
                name: 'team',
                type: 'Team',
                connectionType: 'MANY_TO_MANY',
                reverseName: 'members',
              },
              {
                name: 'members',
                type: 'User',
                connectionType: 'MANY_TO_MANY',
                reverseName: 'team',
              },
            ],
            update: true,
            permittedFields: ['evaluation'],
          },
        ],
      },
    };

    it('anonymous can read', async () => {
      assert.equal(await testPermission(
        anonymousCredentials,
        'User',
        'read',
        {},
        user,
        options,
      ), true);
    });

    it('any logged-in can read', async () => {
      assert.equal(await testPermission(
        strangerCredentials,
        'User',
        'read',
        {},
        user,
        options,
      ), true);
    });

    it('loggedIn can create new', async () => {
      assert.equal(await testPermission(
        strangerCredentials,
        'User',
        'create',
        {},
        user,
        options,
      ), true);
    });

    it('loggedIn can not do anything else', async () => {
      for (const permission of ['update', 'replace', 'delete']) {
        assert.equal(await testPermission(
          strangerCredentials,
          'User',
          permission,
          user,
          user,
          options,
        ), false);
      }
    });

    it('self can delete', async () => {
      assert.equal(await testPermission(
        userCredentials,
        'User',
        'delete',
        user,
        {},
        options,
      ), true);
    });

    it('team can update evaluation', async () => {
      assert.equal(await testPermission(
        teamMate1Credentials,
        'User',
        'update',
        user,
        {
          evaluation: 'You are awesome!',
        },
        options,
      ), true);
    });

    it('team can not update fired', async () => {
      assert.equal(await testPermission(
        teamMate1Credentials,
        'User',
        'update',
        user,
        {
          evaluation: 'You are awesome!',
          fired: true,
        },
        options,
      ), false);
    });

    it('supervisor can update evaluation and fired', async () => {
      assert.equal(await testPermission(
        supervisorCredentials,
        'User',
        'update',
        user,
        {
          evaluation: 'You are awesome!',
          fired: true,
        },
        options,
      ), true);
    });

    it('supervisor can not delete', async () => {
      assert.equal(await testPermission(
        supervisorCredentials,
        'User',
        'delete',
        user,
        {},
        options,
      ), false);
    });

    it('supervisor of supervisor can delete', async () => {
      assert.equal(await testPermission(
        supervisorSupervisorCredentials,
        'User',
        'delete',
        user,
        {},
        options,
      ), true);
    });

    it('supervisor of team can delete', async () => {
      assert.equal(await testPermission(
        teamSupervisorCredentials,
        'User',
        'delete',
        user,
        {},
        options,
      ), true);
    });
  });

  describe('related permissions', () => {
    const permittedID = {
      type: 'User',
      value: 'permitted-id',
    };
    const permittedAllID = {
      type: 'User',
      value: 'permitted-all-id',
    };
    const notPermittedID = {
      type: 'User',
      value: 'not-permitted-id',
    };
    const permittedCredentials = {
      isAdmin: false,
      userID: permittedID,
    };
    const permittedAllCredentials = {
      isAdmin: false,
      userID: permittedAllID,
    };
    const notPermittedCredentials = {
      isAdmin: false,
      userID: notPermittedID,
    };
    const credentials = [
      notPermittedCredentials,
      permittedCredentials,
      permittedAllCredentials,
    ];
    const relatedObject = {
      id: {
        type: 'Related',
        value: 'related-object-id',
      },
      permittedOne: permittedID,
      permittedAll: permittedAllID,
    };
    const relatedObject2 = {
      id: {
        type: 'Related',
        value: 'related-object-id-2',
      },
      permittedAll: permittedAllID,
    };
    const options = {
      db: new MockDB([
        relatedObject,
        relatedObject2,
      ]),
      typePermissions: {
        Thing: {
          AUTHENTICATED: {
            read: true,
            create: true,
            update: true,
            delete: true,
          },
        },
      },
      connectionPermissions: {
        Thing: [],
        Related: [
          {
            userPath: ['permittedOne'],
            path: [
              {
                name: 'permittedOne',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'permittedOneOf',
              },
            ],
            update: true,
            permittedFields: ['related1', 'relatedMany'],
          },
          {
            userPath: ['permittedAll'],
            path: [
              {
                name: 'permittedAll',
                type: 'User',
                connectionType: 'ONE_TO_MANY',
                reverseName: 'permittedAllOf',
              },
            ],
            update: true,
            permittedFields: ['related1', 'related2', 'relatedMany'],
          },
        ],
      },
      relatedPermissions: {
        Thing: [
          {
            name: 'related1',
            type: 'Related',
            reverseName: 'related1',
            connectionType: 'ONE_TO_MANY',
          },
          {
            name: 'related2',
            type: 'Related',
            reverseName: 'related2',
            connectionType: 'ONE_TO_MANY',
          },
          {
            name: 'relatedMany',
            type: 'Related',
            reverseName: 'relatedMany',
            connectionType: 'MANY_TO_MANY',
          },
        ],
        Related: [
          {
            name: 'related1',
            type: 'Thing',
            reverseName: 'related1',
            connectionType: 'MANY_TO_ONE',
          },
          {
            name: 'related2',
            type: 'Thing',
            reverseName: 'related2',
            connectionType: 'MANY_TO_ONE',
          },
          {
            name: 'relatedMany',
            type: 'Thing',
            reverseName: 'relatedMany',
            connectionType: 'MANY_TO_MANY',
          },
        ],
      },
    };

    async function assertWithAllCredentials(
      permission,
      oldObject,
      newObject,
      assertions
    ) {
      for (const [name, credential, assertion] of zip(
        ['no related', 'one related', 'all related'],
        credentials,
        assertions
      )) {
        assert.equal(await testPermission(
          credential,
          'Thing',
          permission,
          oldObject,
          newObject,
          options
        ), assertion, name);
      }
    }

    it('creating and not connecting', async () => {
      await assertWithAllCredentials(
        'create',
        {},
        {},
        [true, true, true]
      );
    });

    it('creating and connecting one', async () => {
      await assertWithAllCredentials(
        'create',
        {},
        {
          related1: relatedObject.id,
        },
        [false, true, true]
      );
    });

    it('creating and connecting all', async () => {
      await assertWithAllCredentials(
        'create',
        {},
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        [false, false, true]
      );
    });

    it('updating and not changing connection', async () => {
      await assertWithAllCredentials(
        'update',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {},
        [true, true, true]
      );
    });

    it('updating and changing connection to same', async () => {
      await assertWithAllCredentials(
        'update',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        [true, true, true]
      );
    });

    it('updating and changing connection from null', async () => {
      await assertWithAllCredentials(
        'update',
        {
          related1: null,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject.id,
        },
        [false, true, true]
      );
    });

    it('updating and changing connection to different', async () => {
      await assertWithAllCredentials(
        'update',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject2.id,
        },
        [false, false, true]
      );
    });

    it('updating and changing all connections', async () => {
      await assertWithAllCredentials(
        'update',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject2.id,
          related2: relatedObject2.id,
        },
        [false, false, true]
      );
    });

    it('replacing unconnected', async () => {
      await assertWithAllCredentials(
        'replace',
        {},
        {},
        [true, true, true]
      );
    });

    it('replacing and omiting connection', async () => {
      await assertWithAllCredentials(
        'replace',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject2.id,
        },
        [false, false, true]
      );
    });

    it('replacing and not changing connection', async () => {
      await assertWithAllCredentials(
        'replace',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        [true, true, true]
      );
    });

    it('replacing and changing connection', async () => {
      await assertWithAllCredentials(
        'replace',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject2.id,
          related2: relatedObject.id,
        },
        [false, false, true]
      );
      await assertWithAllCredentials(
        'replace',
        {
          related1: relatedObject2.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        [false, false, true]
      );
    });

    it('replacing and changing all connections', async () => {
      await assertWithAllCredentials(
        'replace',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {
          related1: relatedObject2.id,
          related2: relatedObject2.id,
        },
        [false, false, true]
      );
    });

    it('deleting unconnected', async () => {
      await assertWithAllCredentials(
        'delete',
        {},
        {},
        [true, true, true]
      );
    });

    it('deleting connected to one one-to-many', async () => {
      await assertWithAllCredentials(
        'delete',
        {
          related1: relatedObject.id,
        },
        {},
        [false, true, true]
      );
      await assertWithAllCredentials(
        'delete',
        {
          related1: relatedObject2.id,
        },
        {},
        [false, false, true]
      );
    });

    it('deleting connected to many one-to-many', async () => {
      await assertWithAllCredentials(
        'delete',
        {
          related1: relatedObject.id,
          related2: relatedObject.id,
        },
        {},
        [false, false, true]
      );
    });

    it('deleting connected many-to-many', async () => {
      await assertWithAllCredentials(
        'delete',
        {},
        {},
        [true, true, true]
      );

      await assertWithAllCredentials(
        'delete',
        {
          relatedMany: [],
        },
        {},
        [true, true, true]
      );

      await assertWithAllCredentials(
        'delete',
        {
          relatedMany: [relatedObject],
        },
        {},
        [false, false, false]
      );

      await assertWithAllCredentials(
        'delete',
        {
          relatedMany: [relatedObject, relatedObject2],
        },
        {},
        [false, false, false]
      );
    });
  });
});
