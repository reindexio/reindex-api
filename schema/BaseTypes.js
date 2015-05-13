const BaseTypes = [
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
    methods: [
      {
        name: 'get',
        arguments: [
          {
            name: 'ids',
            type: 'array',
            childType: {
              type: 'string',
            },
          },
        ],
        returns: 'connection',
      },
    ],
  }, {
    name: 'edges',
    fields: [
      {
        name: 'cursor',
        type: 'cursor',
      }, {
        name: 'node',
        type: 'object',
      },
    ],
  }, {
    name: 'nodes',
    fields: [
      {
        name: 'node',
        type: 'object',
      },
    ],
  }, {
    name: 'schemaResult',
    fields: [
      {
        name: 'success',
        type: 'boolean',
      },
    ],
  }, {
    name: 'mutationResult',
    fields: [
      {
        name: 'success',
        type: 'boolean',
      },
      {
        name: 'changes',
        type: 'array',
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
    ],
  }, {
    name: 'schema',
    fields: [
      {
        name: 'calls',
        type: 'array',
        inlineType: 'call',
      },
      {
        name: 'types',
        type: 'array',
        inlineType: 'type',
      },
    ],
  }, {
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
        name: 'args',
        type: 'array',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'type',
            type: 'string',
          },
        ],
      },
    ],
  }, {
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
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'type',
            type: 'string',
          },
        ],
      },
    ],
  },
];

export default BaseTypes;
