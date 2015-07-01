import {Record} from 'immutable';

/**
 * Validator that checks that there is no index with parameter's name, for a
 * type with typeParameter's name.
 */
export default class NoIndexValidator extends Record({
  typeParameter: undefined,
}) {
  validate(schema, value, parameters) {
    const existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      const existingIndex = existingType.indexes.get(value);
      if (existingIndex) {
        throw new Error(
          `Type "${existingType.name}" already has an index "${value}".`
        );
      }
    }
    return value;
  }
}
