import {Record} from 'immutable';

/**
 * Validator that checks that no type with parameter's name.
 */
export default class NoTypeValidator extends Record({
}) {
  validate(schema, value) {
    let existingType = schema.types.get(value);
    if (existingType) {
      if (existingType.isNode) {
        throw new Error(
          `Type "${value}" already exists.`
        );
      } else {
        throw new Error(
          `Type "${value}" is a built-in non-node type.`
        );
      }
    }
    return value;
  }
}
