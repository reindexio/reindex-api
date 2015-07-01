import {Record, List} from 'immutable';

/**
 * A validator that checks that every element of array `value` validate against
 * `validators`
 */
export default class ArrayValidator extends Record({
  validators: List(),
}) {
  validate(schema, value, parameters) {
    return value.map((element) => {
      return this.validators.reduce((next, validator) => (
        validator.validate(schema, next, parameters)
      ), element);
    });
  }
}
