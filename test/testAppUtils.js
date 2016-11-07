import uuid from 'uuid';
import { chain, get, indexBy, values } from 'lodash';
import { graphql } from 'graphql';

import Config from '../server/Config';
import DatabaseTypes from '../db/DatabaseTypes';
import deleteApp from '../apps/deleteApp';
import getAdminDB from '../db/getAdminDB';
import Monitoring from '../Monitoring';
import { createAdminApp } from '../apps/createApp';
import { TIMESTAMP } from '../graphQL/builtins/DateTime';
import createApp from '../apps/createApp';
import getDB from '../db/getDB';
import createReindex from '../graphQL/createReindex';
import { toReindexID } from '../graphQL/builtins/ReindexID';
import { TEST_SCHEMA } from './fixtures';
import assert from './assert';

export function makeRunQuery(db) {
  return async function runQuery(query, variables, {
    credentials,
    printErrors = true,
  } = {}) {
    if (!credentials) {
      credentials = {
        isAdmin: true,
        userID: null,
      };
    }

    db.clearCache();

    const { schema, context } = await createReindex().getOptions({
      db,
      credentials,
    });

    const result = await graphql(
      schema,
      query,
      null,
      context,
      variables,
    );

    if (printErrors) {
      for (const error of result.errors || []) {
        console.log(error.stack);
      }
    }

    if (result.errors) {
      result.errors = result.errors.map((error) => ({
        message: error.message,
      }));
    }

    return result;
  };
}

export async function migrate(runQuery, newTypes, force) {
  const migrationResult = await runQuery(`
    mutation migrate($input: ReindexMigrationInput!) {
      migrate(input: $input) {
        isExecuted
      }
    }
  `, {
    input: {
      types: newTypes,
      force,
    },
  });

  assert.deepEqual(migrationResult, {
    data: {
      migrate: {
        isExecuted: true,
      },
    },
  });
}

export async function createTestApp(hostname) {
  await createApp(hostname);
  const db = await getDB(hostname);
  const runQuery = makeRunQuery(db);
  await migrate(runQuery, TEST_SCHEMA);
}

export async function getTypesByName(db) {
  const types = await db.getTypes();
  return chain(types)
    .indexBy((type) => type.name)
    .mapValues((value) => toReindexID(value.id))
    .value();
}

export async function createFixture(
  runQuery,
  type,
  input,
  outputFragment,
  options = {}
) {
  const result = await runQuery(`
    mutation create($input: _Create${type}Input!) {
      create${type}(input: $input) {
        changed${type} {
          ${outputFragment}
        }
      }
    }
  `, {
    input,
  }, options);
  assert.deepEqual(result.errors, undefined,
    `Failed to create fixture: ${result.errors}`);
  return get(result, [
    'data',
    `create${type}`,
    `changed${type}`,
  ]);
}

export async function deleteFixture(runQuery, type, id, options = {}) {
  const result = await runQuery(`
    mutation delete($id: ID!) {
      delete${type}(input: { id: $id }) {
        id
      }
    }
  `, {
    id,
  }, options);
  assert.deepEqual(result.errors, undefined,
    `Failed to delete fixture: ${result.errors}`);
}

// Given a list of objects with each having at least `name` field, update
// current schema by merging types by name and adding types that don't have
// a match in base schema
//
// Fields and permissions are also combined, fields are merged by name.
export function augmentSchema(baseSchema, augmentation) {
  const baseByName = indexBy(baseSchema, (type) => type.name);
  for (const updatedType of augmentation) {
    if (baseByName[updatedType.name]) {
      const oldType = baseByName[updatedType.name];
      baseByName[oldType.name] = {
        ...oldType,
        ...updatedType,
        permissions: [
          ...oldType.permissions || [],
          ...updatedType.permissions || [],
        ],
        fields: mergeFields(oldType.fields, updatedType.fields || []),
      };
    } else {
      baseByName[updatedType.name] = updatedType;
    }
  }

  return values(baseByName);
}

function mergeFields(oldFields, newFields) {
  const oldByName = indexBy(oldFields, (field) => field.name);
  for (const newField of newFields) {
    if (oldByName[newField.name]) {
      const oldField = oldByName[newField.name];
      oldByName[oldField.name] = {
        ...oldField,
        ...newField,
      };
    } else {
      oldByName[newField.name] = newField;
    }
  }

  return values(oldByName);
}

export async function testSetup(adminHostname) {
  Monitoring.setLogging(false);
  Config.resetTestConfig();

  const adminDatabase = 'testadmin_' + uuid.v4().replace(/-/g, '_');
  let settings;
  let defaultDatabaseType;
  if (process.env.DATABASE_TYPE === DatabaseTypes.RethinkDB) {
    settings = {
      type: DatabaseTypes.RethinkDB,
      host: 'localhost',
    };
    defaultDatabaseType = DatabaseTypes.RethinkDB;
  } else {
    settings = {
      type: DatabaseTypes.MongoDB,
      connectionString: 'mongodb://localhost/',
    };
    defaultDatabaseType = DatabaseTypes.MongoDB;
  }

  Config.set('database.adminDatabase', adminDatabase);
  Config.set('database.adminDatabaseSettings', JSON.stringify(settings));
  Config.set('database.defaultDatabaseType', defaultDatabaseType);

  await createAdminApp(adminHostname);
  await createStorage(settings);
}

export async function testTearDown(adminHostname) {
  await deleteApp(adminHostname);
}

async function createStorage(settings) {
  const adminDB = getAdminDB();
  try {
    await adminDB.create('Storage', {
      createdAt: TIMESTAMP,
      databasesAvailable: 200,
      settings,
    });
  } finally {
    await adminDB.close();
  }
}
