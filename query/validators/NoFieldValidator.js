import {Record} from 'immutable';

/**
 * Validator that checks that there is no field with parameter's name, for a
 * type with typeParameter's name.
 */
export default class NoFieldValidator extends Record({
  typeParameter: undefined,
}) {
  validate(schema, value, parameters) {
    let existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      let existingField = existingType.fields.get(value);
      if (existingField) {
        throw new Error(
          `Type "${existingType.name}" already has a field "${value}".`
        );
      }
    }
    return value;
  }
}
