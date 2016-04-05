import uuid from 'uuid';
import { graphql } from 'graphql';

import getDB from '../db/getDB';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import assert from '../test/assert';
import createApp from '../apps/createApp';
import deleteApp from '../apps/deleteApp';

describe('Migrations', () => {
  const host = `test.${uuid.v4()}.example.com`;
  let db;

  before(async () => {
    await createApp(host);
    db = await getDB(host);
  });

  after(async () => {
    await db.close();
    await deleteApp(host);
  });

  async function runMigration(input) {
    const context = getGraphQLContext(db, await db.getMetadata(), {
      credentials: {
        isAdmin: true,
        userID: 'admin',
      },
    });
    return await graphql(context.schema, `
      mutation migration($input: ReindexMigrationInput!) {
        migrate(input: $input) {
          commands {
            commandType,
            isDestructive,
            description
          },
          isExecuted
        }
      }`,
      context, {
        input,
      }
    );
  }

  it('migrates without asking for non-destructive operations', async () => {
    const newSchema = [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'microposts',
            type: 'Connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
        kind: 'OBJECT',
        description: 'A user',
        interfaces: ['Node'],
      },
      {
        name: 'Micropost',
        kind: 'OBJECT',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'createdAt',
            type: 'String',
          },
          {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
      },
    ];

    let result = await runMigration({
      types: newSchema,
      dryRun: true,
    });

    const commands = [
      {
        commandType: 'CreateTypeData',
        description: 'create storage for type Micropost',
        isDestructive: false,
      },
      {
        commandType: 'CreateType',
        description: 'create new type Micropost',
        isDestructive: false,
      },
      {
        commandType: 'CreateField',
        description: 'add new field author (User) to type Micropost',
        isDestructive: false,
      },
      {
        commandType: 'CreateField',
        description: 'add new field createdAt (String) to type Micropost',
        isDestructive: false,
      },
      {
        commandType: 'CreateField',
        description: 'add new field id (ID) to type Micropost',
        isDestructive: false,
      },
      {
        commandType: 'UpdateTypeInfo',
        description: 'update metadata of type User',
        isDestructive: false,
      },
      {
        commandType: 'CreateField',
        description: 'add new field microposts (Connection) to type User',
        isDestructive: false,
      },
    ];

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands,
          isExecuted: false,
        },
      },
    });

    result = await runMigration({
      types: newSchema,
    });

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands,
          isExecuted: true,
        },
      },
    });

    result = await runMigration({
      types: newSchema,
    });

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands: [],
          isExecuted: true,
        },
      },
    });
  });

  it('requires force to migrate with destructive operations', async () => {
    const newSchema = [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'microposts',
            type: 'Connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
        kind: 'OBJECT',
        description: 'A user',
        interfaces: ['Node'],
      },
      {
        name: 'Micropost',
        kind: 'OBJECT',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
      },
    ];

    let result = await runMigration({
      types: newSchema,
    });

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands: [
            {
              commandType: 'DeleteField',
              isDestructive: false,
              description: 'remove field createdAt from type Micropost',
            },
            {
              commandType: 'DeleteFieldData',
              isDestructive: true,
              description: 'remove field data at createdAt from type Micropost',
            },
          ],
          isExecuted: false,
        },
      },
    });

    result = await runMigration({
      types: newSchema,
      force: true,
    });

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands: [
            {
              commandType: 'DeleteField',
              isDestructive: false,
              description: 'remove field createdAt from type Micropost',
            },
            {
              commandType: 'DeleteFieldData',
              isDestructive: true,
              description: 'remove field data at createdAt from type Micropost',
            },
          ],
          isExecuted: true,
        },
      },
    });

    result = await runMigration({
      types: newSchema,
    });

    assert.deepEqual(result, {
      data: {
        migrate: {
          commands: [],
          isExecuted: true,
        },
      },
    });
  });

  it('validates new schema', async () => {
    const newSchema = [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'microposts',
            type: 'Connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
        kind: 'OBJECT',
        interfaces: ['Node'],
      },
      {
        name: 'User',
        kind: 'OBJECT',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
          {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
      },
    ];

    const result = await runMigration({
      types: newSchema,
    });

    assert(result.errors);
  });

  it('does not fail when deleting freshly created types', async () => {
    const newSchema = [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
        ],
        kind: 'OBJECT',
        interfaces: ['Node'],
      },
      {
        name: 'Test',
        kind: 'OBJECT',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
        ],
      },
    ];

    const emptySchema = [
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
            unique: true,
          },
        ],
        kind: 'OBJECT',
        interfaces: ['Node'],
      },
    ];

    await runMigration({
      types: newSchema,
      force: true,
    });

    const result = await runMigration({
      types: emptySchema,
      force: true,
    });

    assert.equal(result.data.migrate.isExecuted, true);
  });
});
