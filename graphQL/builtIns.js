import {
  GraphQLInterfaceType,
  GraphQLScalarType,
  GraphQLID,
} from 'graphql';
import {Kind} from 'graphql/language';

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  coerce(value) {
    if (value.toISOString) {
      return value.toISOString();
    } else {
      return null;
    }
  },
  coerceLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const result = new Date(ast.value);
      if (!isNaN(result)) {
        return result;
      }
    }
  },
});

export function createInterfaces() {
  return {
    Connection: new GraphQLInterfaceType({
      name: '_Connection',
      description: '',
      fields: {},
    }),
    Edge: new GraphQLInterfaceType({
      name: '_Edge',
      description: '',
      fields: {},
    }),
    Mutation: new GraphQLInterfaceType({
      name: '_Mutation',
      description: '',
      fields: {
        clientMutationId: {
          type: GraphQLID,
        },
      },
    }),
  };
}
