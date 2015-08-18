import Base64URL from 'base64-url';
import {GraphQLScalarType} from 'graphql';
import {Kind} from 'graphql/language';

export function toCursor({index, value}) {
  return Base64URL.encode(index + ':' + value);
}

export function fromCursor(string) {
  const parts = Base64URL.decode(string).split(':');
  if (parts.length === 2) {
    return new Cursor({
      index: parts[0],
      value: parts[1],
    });
  } else {
    return null;
  }
}

export class Cursor {
  constructor({index, value}) {
    this.index = index;
    this.value = value;
  }
}

const CursorType = new GraphQLScalarType({
  name: 'Cursor',
  serialize(value) {
    if (value.index && value.value) {
      return toCursor(value);
    } else {
      return null;
    }
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return fromCursor(ast.value);
    } else {
      return null;
    }
  },
  parseValue(value) {
    return fromCursor(value);
  },
});

export default CursorType;
