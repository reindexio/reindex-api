import {Record} from 'immutable';

const NODE_NAME_REGEXP = /^[A-Z][a-zA-z0-9_]*$/;

/**
 *Validator that checks that the paramater is a valid name for a node.
 */
export default class ValidNodeNameValidator extends Record({
}) {
  validate(_, value) {
    if (!NODE_NAME_REGEXP.test(value)) {
      throw new Error(
        `Valid type name may only consist of ASCII letters or numbers and  ` +
        `should start with a capital letter (A-Z). Received "${value}" instead.`
      );
    }
    return value;
  }
}
