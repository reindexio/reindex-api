import { omit, isEmpty } from 'lodash';
import createInputObjectType from './createInputObjectType';
import ReindexID from './builtins/ReindexID';

export default class TypeSet {
  constructor(
    { type, connection, inputObject, payload, blacklistedRootFields }
  ) {
    this.type = type;
    this.connection = connection || null;
    this._inputObject = inputObject || null;
    this.payload = payload || null;
    this.blacklistedRootFields = blacklistedRootFields || [];
  }

  getInputObjectFields() {
    return omit(this.type.getFields(), (field) => {
      const fieldType = field.type.ofType ? field.type.ofType : field.type;
      return (
        fieldType === ReindexID ||
        fieldType.name.endsWith('Connection')
      );
    });
  }

  getInputObject(getTypeSet, interfaces) {
    if (!this._inputObject) {
      const fields = this.getInputObjectFields();
      if (!isEmpty(fields)) {
        this._inputObject = createInputObjectType(
          this, getTypeSet, interfaces, fields
        );
      }
    }
    return this._inputObject;
  }
}
