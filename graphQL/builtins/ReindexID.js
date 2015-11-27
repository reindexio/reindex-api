import Base64URL from 'base64-url';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

export function toReindexID({ type, value }) {
  return Base64URL.encode(type + ':' + value.toString());
}

export function fromReindexID(string) {
  const parts = Base64URL.decode(string).split(':');
  if (parts.length === 2) {
    return {
      type: parts[0],
      value: parts[1],
    };
  } else {
    return null;
  }
}

const ReindexID = new GraphQLScalarType({
  name: 'ID',
  serialize(value) {
    if (value.type && value.value) {
      return toReindexID(value);
    } else {
      return null;
    }
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return fromReindexID(ast.value);
    } else {
      return null;
    }
  },
  parseValue(value) {
    return fromReindexID(value);
  },
});

export default ReindexID;
