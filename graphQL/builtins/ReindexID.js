import Base64URL from 'base64-url';
import {GraphQLScalarType} from 'graphql';
import {Record} from 'immutable';
import {Kind} from 'graphql/language';

export function toReindexID({type, value}) {
  return Base64URL.encode(type + ':' + value);
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

export const ID = new Record({
  value: undefined,
  type: undefined,
});

const ReindexID = new GraphQLScalarType({
  name: 'ID',
  coerce(value) {
    if (value.value && value.type) {
      return new ID(value);
    } else {
      return null;
    }
  },
  coerceLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return fromReindexID(ast.value);
    } else {
      return null;
    }
  },
});

export default ReindexID;
