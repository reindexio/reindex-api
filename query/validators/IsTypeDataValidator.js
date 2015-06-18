import {Record} from 'immutable';
import convertType from '../../schema/convertType';
import SchemaPrimitiveField from '../../schema/fields/SchemaPrimitiveField';
import SchemaNodeField from '../../schema/fields/SchemaNodeField';

/**
 * Validator that checks that given data is valid data for given type
 */
export default class IsTypeDataValidator extends Record({
  typeParameter: undefined,
  checkRequired: true,
}) {
  validate(schema, data, parameters) {
    const existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      return validateType(schema, data, existingType, this.checkRequired);
    }
    return data;
  }
}

function validateType(schema, data, type, checkRequired) {
  const fields = type.fields
    .filter((field) => {
      return (
        field instanceof SchemaPrimitiveField ||
        field instanceof SchemaNodeField
      );
    });

  if (checkRequired) {
    const missingRequired = fields
      .filterNot((p) => p.name === 'id')
      .keySeq()
      .toSet()
      .subtract(data.keySeq().toSet());

    if (missingRequired.count() > 0) {
      throw new Error(
        `Type "${type.name}" has missing required field(s) ` +
        `${missingRequired.join(', ')}.`
      );
    }
  }

  return data.map((value, key) => {
    const field = fields.get(key);
    if (field) {
      const nestedType = schema.types.get(field.type);
      if (nestedType) {
        return value;
      } else {
        return convertType(field.type, value);
      }
    } else {
      throw new Error(`Type "${type.name}" does not have a field "${key}".`);
    }
  });
}
