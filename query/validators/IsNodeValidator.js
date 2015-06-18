import {Record} from 'immutable';

/**
 * Validator that checks that there is a node with parameter's name.
 */
export default class IsNodeValidator extends Record({
}) {
  validate(schema, value) {
    const existingType = schema.types.get(value);
    if (!existingType) {
      throw new Error(
        `Type "${value}" does not exist.`
      );
    } else if (!existingType.isNode) {
      throw new Error(
        `Type "${value}" is not a node. Expected node.`
      );
    }
    return value;
  }
}
