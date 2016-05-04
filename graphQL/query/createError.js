import { GraphQLString } from 'graphql';

export default function createError() {
  return {
    type: GraphQLString,
    description: 'A field that always returns an error. For testing purposes.',
    resolve() {
      throw new Error('A very secret internal error');
    },
  };
}
