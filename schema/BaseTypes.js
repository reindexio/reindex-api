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
    name: '__type__',
    fields: [
      {
        name: 'name',
        type: 'string',
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
