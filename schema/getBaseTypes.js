import {fromJS, Map, List} from 'immutable';
import methods from '../query/methods';
import rootCalls from '../query/rootCalls';

const builtIns = fromJS([
  {
    name: 'connection',
    fields: [
      {
        name: 'edges',
        type: 'edges',
      },
      {
        name: 'count',
        type: 'count',
      },
      {
        name: 'nodes',
        type: 'nodes',
      },
    ],
  },
  {
    name: 'edges',
    fields: [
      {
        name: 'cursor',
        type: 'cursor',
      }, {
        name: 'node',
        type: 'node',
      },
    ],
  },
  {
    name: 'nodesResult',
    fields: [
      {
        name: 'objects',
        type: 'connection',
      },
    ],
  },
  {
    name: 'schemaResult',
    fields: [
      {
        name: 'success',
        type: 'boolean',
      },
    ],
  },
  {
    name: 'mutationResult',
    fields: [
      {
        name: 'success',
        type: 'boolean',
      },
      {
        name: 'changes',
        type: 'array',
        target: 'changes',
      },
    ],
  },
  {
    name: 'changes',
    fields: [
      {
        name: 'oldValue',
        type: 'object',
      },
      {
        name: 'newValue',
        type: 'object',
      },
    ],
  },
  {
    name: 'schema',
    fields: [
      {
        name: 'calls',
        type: 'array',
        target: 'call',
      },
      {
        name: 'types',
        type: 'array',
        target: 'type',
      },
    ],
  },
  {
    name: 'call',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'returns',
        type: 'string',
      },
      {
        name: 'parameters',
        type: 'array',
        target: 'parameter',
      },
    ],
  },
  {
    name: 'type',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'isNode',
        type: 'boolean',
      },
      {
        name: 'fields',
        type: 'array',
        target: 'field',
      },
      {
        name: 'parameters',
        type: 'array',
        target: 'parameter',
      },
      {
        name: 'indexes',
        type: 'array',
        target: 'index',
      },
    ],
  },
  {
    name: 'field',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'type',
        type: 'string',
      },
      {
        name: 'target',
        type: 'string',
      },
      {
        name: 'reverseName',
        type: 'string',
      },
    ],
  },
  {
    name: 'parameter',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'type',
        type: 'string',
      },
      {
        name: 'isRequired',
        type: 'boolean',
      },
    ],
  }, {
    name: 'index',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'fields',
        type: 'array',
        target: 'field',
      },
    ],
  },
  {
    name: 'role',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'users',
        reverseName: 'role',
        target: 'userRole',
        type: 'connection',
      },
    ],
    isNode: true,
  },
  {
    name: 'secret',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'value',
        type: 'string',
      },
    ],
    isNode: true,
  },
  {
    name: 'user',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'username',
        type: 'string',
      },
      {
        name: 'roles',
        reverseName: 'user',
        target: 'userRole',
        type: 'connection',
      },
    ],
    isNode: true,
  },
  {
    name: 'userRole',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'role',
        reverseName: 'users',
        type: 'role',
      },
      {
        name: 'user',
        reverseName: 'roles',
        type: 'user',
      },
    ],
    isNode: true,
  },
]);

let cachedTypes;

function getBaseTypes() {
  if (cachedTypes) {
    return cachedTypes;
  } else {
    cachedTypes = Map({
      calls: rootCalls.valueSeq().toList(),
      types: builtIns.map((type) => {
        type = type.set('indexes', List());
        const method = methods.get(type.get('name'));
        if (method) {
          return type.set('parameters', method.parameters.valueSeq());
        } else {
          return type.set('parameters', List());
        }
      }),
    });
    return cachedTypes;
  }
}

export default getBaseTypes;
