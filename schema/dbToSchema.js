import {Map} from 'immutable';
import Schema from './Schema';
import {
  SCHEMA_TYPES,
  SchemaType,
  SchemaPrimitiveField,
  SchemaObjectField,
  SchemaArrayField,
  SchemaConnectionField,
  SchemaReverseConnectionField,
  SchemaCall,
} from './Fields';

/**
 * Convert from database representation of schema to Schema.
 */
export default function dbToSchema(dbSchema) {
  return new Schema({
    calls: convertCalls(dbSchema.get('calls')),
    types: convertTypes(dbSchema.get('types')),
  });
}

function convertCalls(callList) {
  return callList
    .toKeyedSeq()
    .mapEntries(([, call]) => {
      return [
        call.get('name'),
        new SchemaCall({
          name: call.get('name'),
          parameters: call.get('parameters'),
          returns: call.get('returns'),
        }),
      ];
    })
    .toMap();
}

function convertTypes(typeList) {
  let typeMap = typeList
    .toKeyedSeq()
    .mapEntries(([, type]) => {
      return [
        type.get('name'),
        type,
      ];
    })
    .toMap();
  return typeMap.map((type, key, types) => convertType(type, types));
}

function convertType(type, types) {
  return new SchemaType({
    name: type.get('name'),
    fields: convertFields(types, type.get('fields')),
    methods: type.get('methods') || Map(),
  });
}

function convertFields(types, fields) {
  return fields
    .toKeyedSeq()
    .mapEntries(([, field]) => {
      return [
        field.get('name'),
        convertField(field, types),
      ];
    });
}

function convertField(field, types) {
  let fieldName = field.get('name');
  let fieldType = field.get('type');
  if (fieldType === SCHEMA_TYPES.connection && field.get('target')) {
    return new SchemaReverseConnectionField({
      name: fieldName,
      reverseName: field.get('reverseName'),
      target: field.get('target'),
    });
  } else if (fieldType !== SCHEMA_TYPES.connection && types.get(fieldType)) {
    return new SchemaConnectionField({
      name: fieldName,
      reverseName: field.get('reverseName'),
      target: fieldType,
    });
  } else if (fieldType === SCHEMA_TYPES.object && field.get('fields')) {
    return new SchemaObjectField({
      name: fieldName,
      fields: convertFields(types, field.get('fields')),
    });
  } else if (fieldType === SCHEMA_TYPES.array && field.get('fields')) {
    return new SchemaArrayField({
      name: fieldName,
      fields: field.get('fields') && convertFields(types, field.get('fields')),
    });
  } else if (fieldType === SCHEMA_TYPES.array && field.get('inlineType')) {
    return new SchemaArrayField({
      name: fieldName,
      fields: convertType(types.get(field.get('inlineType')), types).fields,
    });
  } else {
    return new SchemaPrimitiveField({
      type: fieldType,
      name: fieldName,
    });
  }
}
