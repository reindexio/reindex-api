import {Record} from 'immutable';

/**
 * Validator that checks that there is a type with parameter's name.
 */
export default class IsTypeValidator extends Record({
}) {
  validate(schema, value) {
    const existingType = schema.types.get(value);
    if (!existingType) {
      throw new Error(
        `Type "${value}" does not exist.`
      );
    }
    return value;
  }
}
