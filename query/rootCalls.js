import {List, Record, Map} from 'immutable';
import Query from './Query';
import IDSelector from './selectors/IDSelector';
import AllSelector from './selectors/AllSelector';
import TypeCreator from './mutators/TypeCreator';
import TypeDeleter from './mutators/TypeDeleter';
import FieldAdder from './mutators/FieldAdder';
import FieldDeleter from './mutators/FieldDeleter';

class RootCall extends Record({
  name: undefined,
  returns: undefined,
  args: List(),
  fn: undefined,
}) {
  toJS() {
    return {
      name: this.name,
      returns: this.returns,
      args: this.args.toJS(),
    };
  }
}

class RootArg extends Record({
  name: undefined,
  type: undefined,
}) {}

const nodes = new RootCall({
  name: 'nodes',
  returns: 'connection',
  args: List([
    new RootArg({
      name: 'typeName',
      type: 'string',
    }),
  ]),
  fn: (type) => {
    return {
      query: new Query({
        selector: new AllSelector(),
        table: type,
      }),
      typeName: type,
    };
  },
});

const node = new RootCall({
  name: 'node',
  returns: 'object',
  args: List([
    new RootArg({
      name: 'typeName',
      type: 'string',
    }),
    new RootArg({
      name: 'id',
      type: 'string',
    }),
  ]),
  fn: (type, id) => {
    return {
      query: new Query({
        selector: new IDSelector({ids: List.of(id)}),
        table: type,
        single: true,
      }),
      typeName: type,
    };
  },
});

const createType = new RootCall({
  name: 'createType',
  returns: 'schemaResult',
  args: List([
    new RootArg({
      name: 'typeName',
      type: 'string',
    }),
  ]),
  fn: (name) => {
    return {
      query: new Query({
        selector: new TypeCreator({
          name: name,
        }),
      }),
    };
  },
});

const deleteType = new RootCall({
  name: 'deleteType',
  returns: 'schemaResult',
  args: List([
    new RootArg({
      name: 'typename',
      type: 'string',
    }),
  ]),
  fn: (name) => {
    return {
      query: new Query({
        selector: new TypeDeleter({
          name: name,
        }),
      }),
    };
  },
});

const addField = new RootCall({
  name: 'addField',
  returns: 'mutationResult',
  args: List([
    new RootArg({
      name: 'tableName',
      type: 'string',
    }),
    new RootArg({
      name: 'name',
      type: 'string',
    }),
    new RootArg({
      name: 'type',
      type: 'string',
    }),
    new RootArg({
      name: 'options',
      type: 'object',
    }),
  ]),
  fn: (tableName, name, type, options = Map()) => {
    return {
      query: new Query({
        selector: new FieldAdder({
          tableName, name, type, options,
        }),
      }),
      typeName: '__type__',
    };
  },
});

const removeField = new RootCall({
  name: 'removeField',
  returns: 'mutationResult',
  args: List([
    new RootArg({
      name: 'tableName',
      type: 'string',
    }),
    new RootArg({
      name: 'name',
      type: 'string',
    }),
  ]),
  fn: (tableName, name) => {
    return {
      query: new Query({
        selector: new FieldDeleter({
          tableName, name,
        }),
      }),
      typeName: '__type__',
    };
  },
});

const rootCalls = Map({
  nodes: nodes,
  node: node,
  createType: createType,
  deleteType: deleteType,
  addField: addField,
  removeField: removeField,
});

export default rootCalls;
