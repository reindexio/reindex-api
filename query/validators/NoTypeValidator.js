import {Record} from 'immutable';

/**
 * Validator that checks that no type with parameter's name.
 */
export default class NoTypeValidator extends Record({
}) {
  validate(schema, name) {
    let existingType = schema.types.get(name);
    if (existingType) {
      if (existingType.isNode) {
        throw new Error(
          `Type "${name}" already exists.`
        );
      } else {
        throw new Error(
          `Type "${name}" is a built-in non-node type.`
        );
      }
    }
    return true;
  }
}
