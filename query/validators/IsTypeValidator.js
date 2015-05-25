import {Record} from 'immutable';

/**
 * Validator that checks that there is a type with parameter's name.
 */
export default class IsTypeValidator extends Record({
}) {
  validate(schema, name) {
    let existingType = schema.types.get(name);
    if (!existingType) {
      throw new Error(
        `Type "${name}" does not exist.`
      );
    }
    return true;
  }
}
