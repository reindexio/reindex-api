import {List, Record, Map} from 'immutable';
import Query from './Query';
import IDSelector from './selectors/IDSelector';
import AllSelector from './selectors/AllSelector';
import TypeCreator from './mutators/TypeCreator';
import TypeDeleter from './mutators/TypeDeleter';

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

function nodesFn(type) {
  return {
    query: new Query({
      selector: new AllSelector(),
      table: type,
    }),
    typeName: type,
  };
}

const nodes = new RootCall({
  name: 'nodes',
  returns: 'connection',
  args: List([
    new RootArg({
      name: 'typeName',
      type: 'string',
    }),
  ]),
  fn: nodesFn,
});

function nodeFn(type, id) {
  return {
    query: new Query({
      selector: new IDSelector({ids: List.of(id)}),
      table: type,
      single: true,
    }),
    typeName: type,
  };
}

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
  fn: nodeFn,
});

function createTypeFn(name) {
  return {
    query: new Query({
      selector: new TypeCreator({
        name: name,
      }),
    }),
  };
}

const createTypeCall = new RootCall({
  name: 'createType',
  returns: 'schemaResult',
  args: List([
    new RootArg({
      name: 'typeName',
      type: 'string',
    }),
  ]),
  fn: createTypeFn,
});

function deleteTypeFn(name) {
  return {
    query: new Query({
      selector: new TypeDeleter({
        name: name,
      }),
    }),
  };
}

const deleteTypeCall = new RootCall({
  name: 'deleteType',
  returns: 'schemaResult',
  args: List([
    new RootArg({
      name: 'typename',
      type: 'string',
    }),
  ]),
  fn: deleteTypeFn,
});

const rootCalls = Map({
  nodes: nodes,
  node: node,
  createType: createTypeCall,
  deleteType: deleteTypeCall,
});

export default rootCalls;
