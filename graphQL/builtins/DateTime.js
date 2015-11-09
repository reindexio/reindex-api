import {
  GraphQLScalarType,
} from 'graphql';
import { Kind } from 'graphql/language';

export const TIMESTAMP = Symbol('TIMESTAMP');

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      if (ast.value === '@TIMESTAMP') {
        return TIMESTAMP;
      }
      const result = new Date(ast.value);
      if (!Number.isNaN(result.getTime())) {
        return result;
      }
    }
    return null;
  },
  parseValue(value) {
    if (value === '@TIMESTAMP') {
      return TIMESTAMP;
    }

    const result = new Date(value);
    if (!Number.isNaN(result.getTime())) {
      return result;
    }
    return null;
  },
});

export default DateTime;
