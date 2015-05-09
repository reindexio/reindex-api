import {List, Record, Map} from 'immutable';
import Query from './Query';
import IDSelector from './selectors/IDSelector';
import AllSelector from './selectors/AllSelector';

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
    preQueries: List(),
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
    preQueries: List(),
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

const rootCalls = Map({
  nodes: nodes,
  node: node,
});

export default rootCalls;
