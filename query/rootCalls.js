import {Record, Map} from 'immutable';
import convertType from '../schema/convertType';
import Query from './Query';
import IDSelector from './selectors/IDSelector';
import AllSelector from './selectors/AllSelector';
import AddTypeMutator from './mutators/AddTypeMutator';
import RemoveTypeMutator from './mutators/RemoveTypeMutator';
import AddFieldMutator from './mutators/AddFieldMutator';
import RemoveFieldMutator from './mutators/RemoveFieldMutator';
import AddConnectionMutator from './mutators/AddConnectionMutator';
import RemoveConnectionMutator from './mutators/RemoveConnectionMutator';
import SchemaSelector from './selectors/SchemaSelector';
import TypeSelector from './selectors/TypeSelector';

class RootCall extends Record({
  name: undefined,
  returns: undefined,
  parameters: Map(),
  fn: undefined,
}) {
  toJS() {
    return {
      name: this.name,
      returns: this.returns,
      parameters: this.parameters.valueSeq().toJS(),
    };
  }

  processParameters(parameters) {
    let missingRequired = this.parameters
      .filter((p) => p.isRequired)
      .keySeq()
      .toSet()
      .subtract(parameters.keySeq().toSet());
    if (missingRequired.count() > 0) {
      throw new Error(
        `Root call "${this.name}" wasn't passed required parameter(s) ` +
        `${missingRequired.join(', ')}.`
      );
    }
    return parameters.mapEntries(([parameter, value]) => {
      let expectedParameter = this.parameters.get(parameter);
      if (expectedParameter) {
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
          `Root call "${this.name}" has no parameter "${parameter}". ` +
          `Valid parameters are ${validParameters}.`
        );
      }
    });
  }
}

class RootParameter extends Record({
  name: undefined,
  type: undefined,
  isRequired: true,
}) {}

const schemaCall = new RootCall({
  name: 'schema',
  returns: 'schema',
  parameters: Map(),
  fn: () => {
    return {
      query: new Query({
        selector: new SchemaSelector(),
      }),
    };
  },
});

const typeCall = new RootCall({
  name: 'type',
  returns: 'type',
  parameters: Map({
    name: new RootParameter({
      name: 'name',
      type: 'string',
    }),
  }),
  fn: (schema, {name}) => {
    return {
      query: new Query({
        selector: new TypeSelector({
          name: name,
        }),
      }),
    };
  },
});

const nodes = new RootCall({
  name: 'nodes',
  returns: 'nodesResult',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
  }),
  fn: (schema, {type}) => {
    return {
      query: new Query({
        selector: new AllSelector({
          tableName: type,
        }),
      }),
      typeName: type,
    };
  },
});

const node = new RootCall({
  name: 'node',
  returns: 'object',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
    id: new RootParameter({
      name: 'id',
      type: 'string',
    }),
  }),
  fn: (schema, {type, id}) => {
    return {
      query: new Query({
        selector: new IDSelector({
          tableName: type,
          id,
        }),
      }),
      typeName: type,
    };
  },
});

const addType = new RootCall({
  name: 'addType',
  returns: 'schemaResult',
  parameters: Map({
    name: new RootParameter({
      name: 'name',
      type: 'string',
    }),
  }),
  fn: (schema, {name}) => {
    return {
      query: new Query({
        selector: new AddTypeMutator({
          name: name,
        }),
      }),
    };
  },
});

const removeType = new RootCall({
  name: 'removeType',
  returns: 'schemaResult',
  parameters: Map({
    name: new RootParameter({
      name: 'name',
      type: 'string',
    }),
  }),
  fn: (schema, {name}) => {
    return {
      query: new Query({
        selector: new RemoveTypeMutator({
          name: name,
        }),
      }),
    };
  },
});

const addField = new RootCall({
  name: 'addField',
  returns: 'mutationResult',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
    fieldName: new RootParameter({
      name: 'fieldName',
      type: 'string',
    }),
    fieldType: new RootParameter({
      name: 'fieldType',
      type: 'string',
    }),
    options: new RootParameter({
      name: 'options',
      type: 'object',
      isRequired: false,
    }),
  }),
  fn: (schema, {type, fieldName, fieldType, options = Map()}) => {
    return {
      query: new Query({
        selector: new AddFieldMutator({
          tableName: type,
          name: fieldName,
          type: fieldType,
          options,
        }),
      }),
      typeName: 'type',
    };
  },
});

const removeField = new RootCall({
  name: 'removeField',
  returns: 'mutationResult',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
    fieldName: new RootParameter({
      name: 'fieldName',
      type: 'string',
    }),
  }),
  fn: (schema, {type, fieldName}) => {
    return {
      query: new Query({
        selector: new RemoveFieldMutator({
          tableName: type,
          name: fieldName,
        }),
      }),
      typeName: 'type',
    };
  },
});

const addConnection = new RootCall({
  name: 'addConnection',
  returns: 'mutationResult',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
    targetType: new RootParameter({
      name: 'targetType',
      type: 'string',
    }),
    connectionName: new RootParameter({
      name: 'connectionName',
      type: 'string',
    }),
    reverseName: new RootParameter({
      name: 'reverseName',
      type: 'string',
    }),
    options: new RootParameter({
      name: 'options',
      type: 'object',
      isRequired: false,
    }),
  }),
  fn: (schema, {
    type,
    targetType,
    connectionName,
    reverseName,
    options = Map()
  }) => {
    return {
      query: new Query({
        selector: new AddConnectionMutator({
          tableName: type,
          targetName: targetType,
          name: connectionName,
          reverseName: reverseName,
          options,
        }),
      }),
      typeName: 'type',
    };
  },
});

const removeConnection = new RootCall({
  name: 'removeConnection',
  returns: 'mutationResult',
  parameters: Map({
    type: new RootParameter({
      name: 'type',
      type: 'string',
    }),
    connectionName: new RootParameter({
      name: 'connectionName',
      type: 'string',
    }),
  }),
  fn: (schema, {type, connectionName}) => {
    let schemaType = schema.types.get(type);
    let connection = schemaType.fields.get(connectionName);
    return {
      query: new Query({
        selector: new RemoveConnectionMutator({
          tableName: type,
          targetName: connection.target,
          name: connectionName,
          reverseName: connection.reverseName,
        }),
      }),
      typeName: 'type',
    };
  },
});

const rootCalls = Map({
  schema: schemaCall,
  type: typeCall,
  nodes: nodes,
  node: node,
  addType: addType,
  removeType: removeType,
  addField: addField,
  removeField: removeField,
  addConnection: addConnection,
  removeConnection: removeConnection,
});

export default rootCalls;
