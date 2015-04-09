import Immutable from 'immutable';

export const SCHEMA_TYPES = {
  number: 'number',
  string: 'string',
  datetime: 'datetime',
  bool: 'boolean',
  object: 'object',
  array: 'array',
  connection: 'connection'
};

export class Schema extends Immutable.Record({
  rootCalls: Immutable.Map(),
  calls: Immutable.Map(),
  tables: Immutable.Map()
}) {}

export class SchemaPrimitiveField extends Immutable.Record({
  name: '',
  type: ''
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

export class SchemaObjectField extends Immutable.Record({
  name: '',
  childSchema: undefined
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

export class SchemaArrayField extends Immutable.Record({
  name: '',
  childSchema: undefined
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

export class SchemaConnectionListField extends Immutable.Record({
  name: '',
  reverseName: '',
  target: ''
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

export class SchemaConnectionField extends Immutable.Record({
  name: '',
  reverseName: '',
  target: ''
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
