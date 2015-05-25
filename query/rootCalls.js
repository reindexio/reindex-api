import {Map, List} from 'immutable';
import {Call, Parameter} from './calls';
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
import NoTypeValidator from './validators/NoTypeValidator';
import IsTypeValidator from './validators/IsTypeValidator';
import IsNodeValidator from './validators/IsNodeValidator';
import NoFieldValidator from './validators/NoFieldValidator';
import IsFieldValidator from './validators/IsFieldValidator';
import IsConnectionValidator from './validators/IsConnectionValidator';

const schemaCall = new Call({
  name: 'schema',
  returns: 'schema',
  parameters: Map(),
  call() {
    return {
      query: new Query({
        selector: new SchemaSelector(),
      }),
    };
  },
});

const typeCall = new Call({
  name: 'type',
  returns: 'type',
  parameters: Map({
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(new IsTypeValidator()),
    }),
  }),
  call(schema, {name}) {
    return {
      query: new Query({
        selector: new TypeSelector({
          name: name,
        }),
      }),
    };
  },
});

const nodes = new Call({
  name: 'nodes',
  returns: 'nodesResult',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
  }),
  call(schema, {type}) {
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

const node = new Call({
  name: 'node',
  returns: 'object',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    id: new Parameter({
      name: 'id',
      type: 'string',
    }),
  }),
  call(schema, {type, id}) {
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

const addType = new Call({
  name: 'addType',
  returns: 'schemaResult',
  parameters: Map({
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(new NoTypeValidator()),
    }),
  }),
  call(schema, {name}) {
    return {
      query: new Query({
        selector: new AddTypeMutator({
          name: name,
        }),
      }),
    };
  },
});

const removeType = new Call({
  name: 'removeType',
  returns: 'schemaResult',
  parameters: Map({
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
  }),
  call(schema, {name}) {
    return {
      query: new Query({
        selector: new RemoveTypeMutator({
          name: name,
        }),
      }),
    };
  },
});

const addField = new Call({
  name: 'addField',
  returns: 'mutationResult',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    fieldName: new Parameter({
      name: 'fieldName',
      type: 'string',
      validators: List.of(new NoFieldValidator({
        typeParameter: 'type',
      })),
    }),
    fieldType: new Parameter({
      name: 'fieldType',
      type: 'string',
    }),
    options: new Parameter({
      name: 'options',
      type: 'object',
      isRequired: false,
    }),
  }),
  call(schema, {type, fieldName, fieldType, options = Map()}) {
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

const removeField = new Call({
  name: 'removeField',
  returns: 'mutationResult',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    fieldName: new Parameter({
      name: 'fieldName',
      type: 'string',
      validators: List.of(new IsFieldValidator({
        typeParameter: 'type',
      })),
    }),
  }),
  call(schema, {type, fieldName}) {
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

const addConnection = new Call({
  name: 'addConnection',
  returns: 'mutationResult',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    targetType: new Parameter({
      name: 'targetType',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    connectionName: new Parameter({
      name: 'connectionName',
      type: 'string',
      validators: List.of(new NoFieldValidator({
        typeParameter: 'type',
      })),
    }),
    reverseName: new Parameter({
      name: 'reverseName',
      type: 'string',
      validators: List.of(new NoFieldValidator({
        typeParameter: 'targetType',
      })),
    }),
    options: new Parameter({
      name: 'options',
      type: 'object',
      isRequired: false,
    }),
  }),
  call(schema, {
    type,
    targetType,
    connectionName,
    reverseName,
    options = Map()
  }) {
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

const removeConnection = new Call({
  name: 'removeConnection',
  returns: 'mutationResult',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    connectionName: new Parameter({
      name: 'connectionName',
      type: 'string',
      validators: List.of(new IsConnectionValidator({
        typeParameter: 'type',
      })),
    }),
  }),
  call(schema, {type, connectionName}) {
    let existingType = schema.types.get(type);
    let connection = existingType.fields.get(connectionName);

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
