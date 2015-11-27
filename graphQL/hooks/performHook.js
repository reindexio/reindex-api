import fetch from 'node-fetch';
import { graphql } from 'graphql';

import { toReindexID } from '../builtins/ReindexID';

export default async function performHook(context, hook) {
  let result;
  try {
    const query = (`
      {
        hook ${hook.fragment}
      }
    `);

    result = await graphql(context.schema, query, context);

    if (!result.errors) {
      await fetch(hook.url, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    }
  } catch (error) {
    result = {
      errors: [error.toString()],
    };
  }

  if (hook.logLevel === 'all' ||
      result.errors && hook.logLevel !== 'none') {
    const hookLogResult = await graphql(context.schema, `
      mutation createLog($input: _CreateReindexHookLogInput!) {
        createReindexHookLog(input: $input) {
          id
        }
      }
    `, context, {
      input: {
        hook: toReindexID(hook.id),
        createdAt: '@TIMESTAMP',
        type: !result || result.errors ? 'error' : 'success',
        errors: result && result.errors,
      },
    });
    if (hookLogResult.errors) {
      console.error(hookLogResult.errors);
    }
  }
}
