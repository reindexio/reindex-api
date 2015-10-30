import fetch from 'node-fetch';
import { graphql } from 'graphql';

export default async function performHook(context, hook) {
  try {
    const query = (`
      {
        hook ${hook.fragment}
      }
    `);

    const result = await graphql(context.schema, query, context);

    if (result.data) {
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
    console.error(error);
  }
}
