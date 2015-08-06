import {
  GraphQLScalarType,
} from 'graphql';
import {Kind} from 'graphql/language';

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  coerce(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    return null;
  },
  coerceLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const result = new Date(ast.value);
      if (!Number.isNaN(result.getTime())) {
        return result;
      }
    }
    return null;
  },
});

export default DateTime;
