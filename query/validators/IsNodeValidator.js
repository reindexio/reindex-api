import {Record} from 'immutable';

/**
 * Validator that checks that there is a node with parameter's name.
 */
export default class IsNodeValidator extends Record({
}) {
  validate(schema, name) {
    let existingType = schema.types.get(name);
    if (!existingType) {
      throw new Error(
        `Type "${name}" does not exist.`
      );
    } else if (!existingType.isNode) {
      throw new Error(
        `Type "${name}" is not a node. Expected node.`
      );
    }
    return true;
  }
}
