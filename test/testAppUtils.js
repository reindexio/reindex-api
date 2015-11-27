import { chain, get } from 'lodash';
import { graphql } from 'graphql';

import createApp from '../apps/createApp';
import getDB from '../db/getDB';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import { toReindexID } from '../graphQL/builtins/ReindexID';
import { TEST_SCHEMA } from './fixtures';
import assert from './assert';

export function makeRunQuery(db) {
  let metadata = null;
  return async function runQuery(query, variables, {
    credentials,
    newContext,
    clearContext,
  } = {}) {
    if (!credentials) {
      credentials = {
        isAdmin: true,
        userID: null,
      };
    }

    if (newContext || !metadata) {
      metadata = await db.getMetadata();
    }

    const context = getGraphQLContext(db, metadata, {
      credentials,
    });

    const result = await graphql(context.schema, query, context, variables);

    if (clearContext) {
      metadata = null;
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
  }, {
    newContext: true,
    clearContext: true,
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
  const db = getDB(hostname);
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
