import {Map, Record, List} from 'immutable';
import convertType from '../schema/convertType';

export class Call extends Record({
  name: undefined,
  returns: undefined,
  parameters: Map(),
  call: undefined,
}) {
  toJS() {
    return {
      name: this.name,
      returns: this.returns,
      parameters: this.parameters.valueSeq().toJS(),
    };
  }

  processParameters(schema, parameters) {
    const possibleParameters = this.parameters.keySeq().toSet();
    const requiredParameters = this.parameters
      .filter((p) => p.isRequired)
      .keySeq()
      .toSet();
    const givenParameters = parameters.keySeq().toSet();

    const missingRequired = requiredParameters.subtract(givenParameters);
    const invalidParameters = givenParameters.subtract(possibleParameters);

    if (missingRequired.count() > 0) {
      throw new Error(
        `Call "${this.name}" wasn't passed required parameter(s) ` +
        `${missingRequired.join(', ')}.`
      );
    }

    if (invalidParameters.count() > 0) {
      throw new Error(
        `Call "${this.name}" was passed invalid parameter(s) ` +
        `${invalidParameters.join(', ')}. Valid parameters are ` +
        `${possibleParameters.join(', ')}.`
      );
    }

    return parameters
      .mapEntries(([parameter, value]) => {
        const expectedParameter = this.parameters.get(parameter);
        return [
          parameter,
          convertType(expectedParameter.type, value),
        ];
      })
      .mapEntries(([parameter, value], _, convertedParameters) => {
        const expectedParameter = this.parameters.get(parameter);
        let newValue;
        try {
          newValue = expectedParameter.validate(
            schema, value, convertedParameters
          );
        } catch (e) {
          throw new Error(
            e.message +
            ` See call "${this.name}", parameter "${parameter}".`
          );
        }
        return [
          expectedParameter.name,
          newValue,
        ];
      });
  }
}

export class Parameter extends Record({
  name: undefined,
  type: undefined,
  isRequired: true,
  validators: List(),
}) {
  validate(schema, value, parameters) {
    return this.validators
      .reduce((nextValue, validator) => {
        return validator.validate(schema, nextValue, parameters);
      }, value);
  }
}
