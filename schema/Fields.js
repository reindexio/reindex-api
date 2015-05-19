import {Record, Map} from 'immutable';

export const SCHEMA_TYPES = {
  number: 'number',
  string: 'string',
  datetime: 'datetime',
  boolean: 'boolean',
  object: 'object',
  array: 'array',
  connection: 'connection',
  cursor: 'cursor',
  type: '__type__',
};

export class SchemaType extends Record({
  name: undefined,
  fields: Map(),
}) {}

export class SchemaPrimitiveField extends Record({
  name: undefined,
  type: undefined,
}) {
  isNestable() {
    return false;
  }

  isEdgeable() {
    return false;
  }

  isConnection() {
    return false;
  }
}

export class SchemaObjectField extends Record({
  name: undefined,
  fields: undefined,
}) {
  isNestable() {
    return true;
  }

  isEdgeable() {
    return false;
  }

  isConnection() {
    return false;
  }
}

export class SchemaArrayField extends Record({
  name: undefined,
  fields: undefined,
}) {
  isNestable() {
    return true;
  }

  isEdgeable() {
    return true;
  }

  isConnection() {
    return false;
  }
}

export class SchemaConnectionField extends Record({
  name: undefined,
  reverseName: undefined,
  target: undefined,
}) {
  isNestable() {
    return true;
  }

  isEdgeable() {
    return false;
  }

  isConnection() {
    return true;
  }
}

export class SchemaReverseConnectionField extends Record({
  name: undefined,
  reverseName: undefined,
  target: undefined,
}) {
  isNestable() {
    return true;
  }

  isEdgeable() {
    return true;
  }

  isConnection() {
    return true;
  }
}

export class SchemaCall extends Record({
  name: undefined,
  parameters: Map(),
  returns: undefined,
}) {}
