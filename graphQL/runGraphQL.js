import {graphql} from 'graphql';

export default async function runGraphQL(
  schema,
  dbContext,
  query,
  variables = {}
) {
  return graphql(schema, query, { dbContext }, variables);
}
