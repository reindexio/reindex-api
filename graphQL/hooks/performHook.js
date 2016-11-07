import fetch from 'node-fetch';
import { graphql } from 'graphql';

import { toReindexID } from '../builtins/ReindexID';

export default async function performHook({ schema, context }, hook) {
  let result;
  let httpResult;
  try {
    const query = (`
      {
        hook ${hook.fragment}
      }
    `);

    result = await graphql(schema, query, null, context);

    if (!result.errors) {
      httpResult = await fetch(hook.url, {
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

  const error = (
    !result || result.errors ||
    !(httpResult.status >= 200 && httpResult.status < 300)
  );

  if (hook.logLevel === 'all' ||
      (error && hook.logLevel !== 'none')) {
    const response = httpResult && {
      status: httpResult.status,
      statusText: httpResult.statusText,
      body: await httpResult.text(),
    };
    const hookLogResult = await graphql(schema, `
      mutation createLog($input: _CreateReindexHookLogInput!) {
        createReindexHookLog(input: $input) {
          id
        }
      }`,
      null,
      context,
      {
        input: {
          hook: toReindexID(hook.id),
          createdAt: '@TIMESTAMP',
          response,
          type: error ? 'error' : 'success',
          errors: result && result.errors,
        },
      },
    );
    if (hookLogResult.errors) {
      console.error(hookLogResult.errors);
    }
  }
}
