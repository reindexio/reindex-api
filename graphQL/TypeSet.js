import { omit, isEmpty, chain, snakeCase } from 'lodash';
import {
  GraphQLEnumType,
} from 'graphql';

import createInputObjectType from './createInputObjectType';
import ReindexID from './builtins/ReindexID';

export default class TypeSet {
  constructor({
    type,
    connection,
    edge,
    inputObject,
    orderableFields,
    payload,
    blacklistedRootFields,
    pluralName,
  }) {
    this.type = type;
    this.connection = connection || null;
    this.edge = edge || null;
    this._inputObject = inputObject || null;
    this.orderableFields = orderableFields || null;
    this.payload = payload || null;
    this.blacklistedRootFields = blacklistedRootFields || [];
    this.pluralName = pluralName || null;
  }

  getInputObjectFields() {
    return omit(this.type.getFields(), (field) => {
      const fieldType = field.type.ofType ? field.type.ofType : field.type;
      return (
        fieldType === ReindexID ||
        (fieldType.name && fieldType.name.endsWith('Connection'))
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

  getOrdering() {
    if (!this._ordering) {
      let fieldNames;
      if (!this.orderableFields) {
        const fields = this.type.getFields();
        fieldNames = chain(fields)
          .values()
          .filter((field) => field.metadata && field.metadata.orderable)
          .map((field) => field.name)
          .value();
      } else {
        fieldNames = this.orderableFields;
      }

      const enumValues = chain(fieldNames)
        .map((name) => [
          [name, 'ASC'],
          [name, 'DESC'],
        ])
        .flatten()
        .indexBy(([name, direction]) =>
          `${snakeCase(name).toUpperCase()}_${direction}`
        )
        .mapValues(([name, direction]) => ({
          value: {
            field: name,
            order: direction,
          },
        }))
        .value();

      if (!isEmpty(enumValues)) {
        this._ordering = new GraphQLEnumType({
          name: `_${this.type.name}Ordering`,
          description:
`A sort ordering, consist of a name of a field and an order
(ascending/descending), in all caps separated by "_".
`,
          values: enumValues,
        });
      }
    }
    return this._ordering;
  }
}
