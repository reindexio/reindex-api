import { omit, isEmpty } from 'lodash';

import createInputObjectType from './createInputObjectType';
import getPluralName from './utilities/getPluralName';
import ReindexID from './builtins/ReindexID';

export default class TypeSet {
  constructor({
    type,
    connection,
    edge,
    inputObject,
    payload,
    blacklistedRootFields,
    pluralName,
  }) {
    this.type = type;
    this.connection = connection || null;
    this.edge = edge || null;
    this._inputObject = inputObject || null;
    this.payload = payload || null;
    this.blacklistedRootFields = blacklistedRootFields || [];
    this.pluralName = getPluralName({ name: type.name, pluralName });
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
