import { difference } from 'lodash';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';
import { graphql } from 'graphql';

import { getMetadata } from '../db/queries/simpleQueries';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import assert from '../test/assert';
import createApp from '../apps/createApp';
import deleteApp from '../apps/deleteApp';

describe('Migrations', () => {
  const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';
  let dbName;
  let conn;

  before(async () => {
    dbName = (await createApp(host)).dbName;
    conn = await RethinkDB.connect({ db: dbName });
  });

  after(async () => {
    await deleteApp(host);
    await conn.close();
  });

  async function runMigration(input) {
    const context = getGraphQLContext(conn, await getMetadata(conn), {
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

    const tables = await RethinkDB.tableList().run(conn);
    assert(difference(['User', 'Micropost'], tables),
      'Both tables are created');
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
});
