import Base64URL from 'base64-url';
import crypto from 'crypto';
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
import InsertMutator from './mutators/InsertMutator';
import UpdateMutator from './mutators/UpdateMutator';
import DeleteMutator from './mutators/DeleteMutator';
import AddSecretMutator from './mutators/AddSecretMutator';
import AddIndexMutator from './mutators/AddIndexMutator';
import RemoveIndexMutator from './mutators/RemoveIndexMutator';
import SchemaSelector from './selectors/SchemaSelector';
import TypeSelector from './selectors/TypeSelector';
import NoTypeValidator from './validators/NoTypeValidator';
import ValidNodeNameValidator from './validators/ValidNodeNameValidator';
import IsTypeValidator from './validators/IsTypeValidator';
import IsNodeValidator from './validators/IsNodeValidator';
import NoFieldValidator from './validators/NoFieldValidator';
import IsFieldValidator from './validators/IsFieldValidator';
import IsConnectionValidator from './validators/IsConnectionValidator';
import IsTypeDataValidator from './validators/IsTypeDataValidator';
import NoIndexValidator from './validators/NoIndexValidator';
import IsIndexValidator from './validators/IsIndexValidator';
import ArrayValidator from './validators/ArrayValidator';

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
          name,
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

const createType = new Call({
  name: 'createType',
  returns: 'type',
  parameters: Map({
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(
        new ValidNodeNameValidator(),
        new NoTypeValidator(),
      ),
    }),
  }),
  call(schema, {name}) {
    return {
      query: new Query({
        selector: new AddTypeMutator({
          name,
        }),
      }),
    };
  },
});

const deleteType = new Call({
  name: 'deleteType',
  returns: 'type',
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
          name,
        }),
      }),
    };
  },
});

const createField = new Call({
  name: 'createField',
  returns: 'type',
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

const deleteField = new Call({
  name: 'deleteField',
  returns: 'type',
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

const createConnection = new Call({
  name: 'createConnection',
  returns: 'type',
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
    fieldName: new Parameter({
      name: 'fieldName',
      type: 'string',
      validators: List.of(new NoFieldValidator({
        typeParameter: 'type',
      })),
    }),
    targetFieldName: new Parameter({
      name: 'targetFieldName',
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
    fieldName,
    targetFieldName,
    options = Map()
  }) {
    return {
      query: new Query({
        selector: new AddConnectionMutator({
          tableName: targetType,
          targetName: type,
          name: targetFieldName,
          reverseName: fieldName,
          options,
        }),
      }),
      typeName: 'type',
    };
  },
});

const deleteConnection = new Call({
  name: 'deleteConnection',
  returns: 'type',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    fieldName: new Parameter({
      name: 'fieldName',
      type: 'string',
      validators: List.of(new IsConnectionValidator({
        typeParameter: 'type',
      })),
    }),
  }),
  call(schema, {type, fieldName}) {
    const existingType = schema.types.get(type);
    const connection = existingType.fields.get(fieldName);

    return {
      query: new Query({
        selector: new RemoveConnectionMutator({
          tableName: connection.type,
          targetName: type,
          name: connection.reverseName,
          reverseName: fieldName,
        }),
      }),
      typeName: 'type',
    };
  },
});

const create = new Call({
  name: 'create',
  returns: 'object',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    data: new Parameter({
      name: 'data',
      type: 'object',
      validators: List.of(new IsTypeDataValidator({
        typeParameter: 'type',
      })),
    }),
  }),
  call(schema, {type, data}) {
    return {
      query: new Query({
        selector: new InsertMutator({
          tableName: type,
          data,
        }),
      }),
      typeName: type,
    };
  },
});

const update = new Call({
  name: 'update',
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
    data: new Parameter({
      name: 'data',
      type: 'object',
      validators: List.of(new IsTypeDataValidator({
        typeParameter: 'type',
        checkRequired: false,
      })),
    }),
  }),
  call(schema, {type, id, data}) {
    return {
      query: new Query({
        selector: new UpdateMutator({
          tableName: type,
          id,
          data,
        }),
      }),
      typeName: type,
    };
  },
});

const deleteCall = new Call({
  name: 'delete',
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
        selector: new DeleteMutator({
          tableName: type,
          id,
        }),
      }),
      typeName: type,
    };
  },
});

function generateSecret() {
  return Base64URL.escape(crypto.randomBytes(30).toString('base64'));
}

const createSecret = new Call({
  name: 'createSecret',
  returns: 'secret',
  parameters: Map(),
  call() {
    const value = generateSecret();
    return {
      query: new Query({
        selector: new AddSecretMutator({ value }),
      }),
    };
  },
});

const createIndex = new Call({
  name: 'createIndex',
  returns: 'type',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(new NoIndexValidator({
        typeParameter: 'type',
      })),
    }),
    fields: new Parameter({
      name: 'fields',
      type: 'array',
      validators: List.of(new ArrayValidator({
        validators: List.of(new IsFieldValidator({
          typeParameter: 'type',
        })),
      })),
    }),
  }),
  call(schema, {type, name, fields}) {
    return {
      query: new Query({
        selector: new AddIndexMutator({
          tableName: type,
          name,
          fields,
        }),
      }),
    };
  },
});

const deleteIndex = new Call({
  name: 'deleteIndex',
  returns: 'type',
  parameters: Map({
    type: new Parameter({
      name: 'type',
      type: 'string',
      validators: List.of(new IsNodeValidator()),
    }),
    name: new Parameter({
      name: 'name',
      type: 'string',
      validators: List.of(new IsIndexValidator({
        typeParameter: 'type',
      })),
    }),
  }),
  call(schema, {type, name}) {
    return {
      query: new Query({
        selector: new RemoveIndexMutator({
          tableName: type,
          name,
        }),
      }),
    };
  },
});

const rootCalls = Map({
  create,
  createConnection,
  createField,
  createIndex,
  createSecret,
  createType,
  delete: deleteCall,
  deleteConnection,
  deleteField,
  deleteIndex,
  deleteType,
  node,
  nodes,
  schema: schemaCall,
  type: typeCall,
  update,
});

export default rootCalls;
