import { omit, isEmpty, chain, snakeCase } from 'lodash';
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
} from 'graphql';
import {
  getFilterFieldEnumName,
  getFilterTypeName,
  getFilterInputName,
} from './derivedNames';
import createInputObjectType from './createInputObjectType';
import { FilterOperation } from './filters';
import ReindexID from './builtins/ReindexID';
import DateTime from './builtins/DateTime';

export default class TypeSet {
  constructor({
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
  }) {
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

  getFilters() {
    return this.filterableFields || [];
  }

  _createFilterTypes() {
    const filters = this.getFilters();
    if (!this._filterType && filters.length > 0) {
      const fieldEnum = new GraphQLEnumType({
        name: getFilterFieldEnumName(this.type.name),
        description: '',
        values: chain(filters)
          .map((filter) => ({
            value: filter,
          }))
          .indexBy((filter) => filter.value)
          .value(),
      });

      const filterFields = {
        op: {
          type: new GraphQLNonNull(FilterOperation),
        },
        field: {
          type: new GraphQLNonNull(fieldEnum),
        },
        valueString: {
          type: GraphQLString,
          description: 'A value to search with for String fields.',
        },
        valueInt: {
          type: GraphQLInt,
          description: 'A value to search with for Int fields',
        },
        valueFloat: {
          type: GraphQLFloat,
          description: 'A value to search with for Float fields',
        },
        valueDateTime: {
          type: DateTime,
          description: 'A value to search with for DateTime fields',
        },
        valueBoolean: {
          type: GraphQLBoolean,
          description: 'A value to search with for Boolean fields',
        },
        valueID: {
          type: ReindexID,
          description: 'A value to search with for Connection or Node fields',
        },
      };


      this._filterType = new GraphQLObjectType({
        name: getFilterTypeName(this.type.name),
        description:
`
`,
        fields: filterFields,
      });

      this._filterInput = new GraphQLInputObjectType({
        name: getFilterInputName(this.type.name),
        description:
`
`,
        fields: filterFields,
      });
    }
  }

  getFilterType() {
    if (!this._filterType) {
      this._createFilterTypes();
    }
    return this._filterType;
  }

  getFilterInput() {
    if (!this._filterInput) {
      this._createFilterTypes();
    }
    return this._filterInput;
  }
}
