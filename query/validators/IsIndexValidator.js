import {Record} from 'immutable';

/**
 * A validator that checks that the type `typeParameter` has a non-built-in
 * index with a name `value`.
 */
export default class IsIndexValidator extends Record({
  typeParameter: undefined,
}) {
  validate(schema, value, parameters) {
    const existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      const existingIndex = existingType.indexes.get(value);
      if (!existingIndex) {
        throw new Error(
          `Type "${existingType.name}" does not have an index "${value}".`
        );
      } else if (value === 'id') {
        throw new Error(
          `Index "${value}" of "${existingType.name}" is a built-in. ` +
          `Expected a non built-in index.`
        );
      }
    }
    return value;
  }
}
