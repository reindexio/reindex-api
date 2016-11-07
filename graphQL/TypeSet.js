import { omit, isEmpty, chain, snakeCase } from 'lodash';
import {
  GraphQLEnumType,
} from 'graphql';
import createInputObjectType from './createInputObjectType';
import ReindexID from './builtins/ReindexID';
import { createFilterArgs } from './filters';

export default class TypeSet {
  constructor({
    id,
    name,
    type,
    connection,
    edge,
    inputObject,
    orderableFields,
    filterableFields,
    filterType,
    filterInput,
    payload,
    blacklistedRootFields,
    pluralName,
    permissions,
  }) {
    this.id = id || null;
    this.name = name || type.name;
    this.type = type;
    this.connection = connection || null;
    this.edge = edge || null;
    this._inputObject = inputObject || null;
    this.orderableFields = orderableFields || null;
    this.filterableFields = filterableFields || null;
    this._filterType = filterType || null;
    this._filterInput = filterInput || null;
    this.payload = payload || null;
    this.blacklistedRootFields = blacklistedRootFields || [];
    this.pluralName = pluralName || null;

    this.rawPermissions = permissions || [];
    this.permissions = null;
    this.connectionTypes = null;
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

  getInputObject(typeRegistry) {
    if (!this._inputObject) {
      const fields = this.getInputObjectFields();
      if (!isEmpty(fields)) {
        this._inputObject = createInputObjectType(this, fields, typeRegistry);
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

  getFilters() {
    return this.filterableFields || [];
  }

  getFilterArgs() {
    if (!this._filterArgs) {
      this._filterArgs = createFilterArgs(this);
    }
    return this._filterArgs;
  }
}
