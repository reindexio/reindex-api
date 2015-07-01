import Schema from './Schema';
import SchemaType from './SchemaType';
import SchemaConnectionField from './fields/SchemaConnectionField';
import SchemaNodeField from './fields/SchemaNodeField';
import SchemaTypeField from './fields/SchemaTypeField';
import SchemaCountField from './fields/SchemaCountField';
import SchemaNodesField from './fields/SchemaNodesField';
import SchemaEdgesField from './fields/SchemaEdgesField';
import SchemaEdgesNodeField from './fields/SchemaEdgesNodeField';
import SchemaCursorField from './fields/SchemaCursorField';
import SchemaObjectsField from './fields/SchemaObjectsField';
import SchemaObjectField from './fields/SchemaObjectField';
import SchemaArrayField from './fields/SchemaArrayField';
import SchemaPrimitiveField from './fields/SchemaPrimitiveField';
import SchemaIndex from './fields/SchemaIndex';

/**
 * Convert from database representation of schema to Schema.
 */
export default function dbToSchema(dbSchema) {
  return new Schema({
    types: convertTypes(dbSchema.get('types')),
  });
}

function convertTypes(typeList) {
  const typeMap = typeList
    .toKeyedSeq()
    .mapEntries(([, type]) => {
      return [
        type.get('name'),
        type,
      ];
    });
  return typeMap
    .map((type, key, types) => convertType(type, types))
    .toMap();
}

function convertType(type, types) {
  return new SchemaType({
    name: type.get('name'),
    fields: convertFields(type, types, type.get('fields')),
    indexes: type
      .get('indexes')
      .map(convertIndex)
      .toKeyedSeq()
      .mapEntries(([, index]) => [index.name, index])
      .toMap(),
    isNode: type.get('isNode') || false,
  });
}

function convertFields(type, types, fields) {
  return fields
    .toKeyedSeq()
    .mapEntries(([, field]) => {
      return [
        field.get('name'),
        convertField(type, field, types),
      ];
    })
    .toMap();
}

function convertField(type, field, types) {
  const fieldName = field.get('name');
  const fieldType = field.get('type');
  const nodeType = types.get(fieldType);

  if (fieldType === 'connection' && field.get('target')) {
    return new SchemaConnectionField({
      name: fieldName,
      reverseName: field.get('reverseName'),
      type: field.get('target'),
    });
  } else if (fieldType === 'type') {
    return new SchemaTypeField({
      name: fieldName,
      type,
    });
  } else if (fieldType === 'count') {
    return new SchemaCountField({
      name: fieldName,
    });
  } else if (fieldType === 'nodes') {
    return new SchemaNodesField({
      name: fieldName,
    });
  } else if (fieldType === 'edges') {
    return new SchemaEdgesField({
      name: fieldName,
    });
  } else if (fieldType === 'node') {
    return new SchemaEdgesNodeField({
      name: fieldName,
    });
  } else if (fieldType === 'cursor') {
    return new SchemaCursorField({
      name: fieldName,
    });
  } else if (fieldType === 'connection') {
    return new SchemaObjectsField({
      name: fieldName,
    });
  } else if (fieldType === 'object') {
    return new SchemaObjectField({
      name: fieldName,
      type: field.get('target'),
    });
  } else if (fieldType === 'array') {
    return new SchemaArrayField({
      name: fieldName,
      type: field.get('target'),
    });
  } else if (nodeType) {
    return new SchemaNodeField({
      name: fieldName,
      reverseName: field.get('reverseName'),
      type: field.get('type'),
    });
  } else {
    return new SchemaPrimitiveField({
      name: fieldName,
      type: fieldType,
    });
  }
}

function convertIndex(index) {
  return new SchemaIndex({
    name: index.get('name'),
    fields: index.get('fields'),
  });
}
