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
    let missingRequired = this.parameters
      .filter((p) => p.isRequired)
      .keySeq()
      .toSet()
      .subtract(parameters.keySeq().toSet());
    if (missingRequired.count() > 0) {
      throw new Error(
        `Call "${this.name}" wasn't passed required parameter(s) ` +
        `${missingRequired.join(', ')}.`
      );
    }
    return parameters.mapEntries(([parameter, value]) => {
      let expectedParameter = this.parameters.get(parameter);
      if (expectedParameter) {
        try {
          expectedParameter.validate(schema, value, parameters);
        } catch (e) {
          throw new Error(
            e.message +
            ` In call "${this.name}" parameter "${parameter}".`
          );
        }
        return [
          expectedParameter.name,
          convertType(expectedParameter.type, value),
        ];
      } else {
        let validParameters = this.parameters
          .keySeq()
          .toArray()
          .join(', ');
        throw new Error(
          `Call "${this.name}" has no parameter "${parameter}". ` +
          `Valid parameters are ${validParameters}.`
        );
      }
    });
  }

}

export class Parameter extends Record({
  name: undefined,
  type: undefined,
  isRequired: true,
  validators: List(),
}) {
  validate(schema, parameter, parameters) {
    return this.validators
      .map((v) => v.validate(schema, parameter, parameters))
      .every((r) => r);
  }
}
