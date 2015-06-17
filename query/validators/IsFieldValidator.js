import {Record} from 'immutable';
import isConnection from '../../schema/fields/isConnection';
import isNode from '../../schema/fields/isNode';

/**
 * A validator that checks that the type `typeParameter` has a non-built-in
 * scalar field with a name `value`.
 */
export default class IsFieldValidator extends Record({
  typeParameter: undefined,
}) {
  validate(schema, value, parameters) {
    let existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      let existingField = existingType.fields.get(value);
      if (!existingField) {
        throw new Error(
          `Type "${existingType.name}" does not have a field "${value}".`
        );
      } else if (value === 'id' || value === '__type__') {
        throw new Error(
          `Field "${value}" of "${existingType.name}" is a built-in. ` +
          ` Expected a non built-in field.`
        );
      } else if (isConnection(existingField) || isNode(existingField)) {
        throw new Error(
          `Field "${value}" of "${existingType.name}" is a connection. ` +
          `Expected a non connection field.`
        );
      }
    }
    return value;
  }
}
