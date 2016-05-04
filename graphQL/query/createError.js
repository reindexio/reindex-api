import { GraphQLString } from 'graphql';

export default function createError() {
  return {
    type: GraphQLString,
    description: 'Query that always returns error. For testing purposes.',
    resolve() {
      throw new Error('A very secret internal error');
    },
  };
}
