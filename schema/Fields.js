import {Record, List, Map} from 'immutable';

export const SCHEMA_TYPES = {
  number: 'number',
  string: 'string',
  datetime: 'datetime',
  bool: 'boolean',
  object: 'object',
  array: 'array',
  connection: 'connection',
  cursor: 'cursor',
  type: '__type__',
};

export class SchemaType extends Record({
  name: '',
  fields: Map(),
  methods: Map(),
}) {}

export class SchemaPrimitiveField extends Record({
  name: '',
  type: '',
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
  name: '',
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
  name: '',
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
  name: '',
  reverseName: '',
  target: '',
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
  name: '',
  reverseName: '',
  target: '',
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
  name: '',
  args: List(),
  returns: '',
}) {}
