import { forEach } from 'lodash';

import assert from '../../../test/assert';
import validateSchema from '../validateSchema';
import { field, type } from './helpers';

import TMDbSchema from './fixtures/TMDbSchema';

const interfaces = { Node: true };

const invalidSchemas = {
  'missing type name': [
    type(undefined),
  ],
  'type name starts with a number': [
    type('00seven'),
  ],
  'type name has illegal characters': [
    type('I-like-lisp'),
  ],
  'lowercase type name': [
    type('mytype'),
  ],
  'reserved type name': [
    type('ReindexThing'),
  ],
  'pluralName starts with a number': [
    type('T', { pluralName: '00sevens' }),
  ],
  'pluralName has illegal characters': [
    type('T', { pluralName: 'I-like-lisps' }),
  ],
  'lowercase pluralName': [
    type('T', { pluralName: 'mytypes' }),
  ],
  'reserved pluralName': [
    type('T', { pluralName: 'ReindexThings' }),
  ],
  'conflicting pluralName': [
    type('T'),
    type('U', { pluralName: 'T' }),
  ],
  'conflicting pluralized name': [
    type('Oxen', { pluralName: 'SomethingElse' }),
    type('Ox'),
  ],
  'unsupported kind': [
    type('T', { kind: 'UNKNOWN' }),
  ],
  'invalid description': [
    type('T', { description: 0 }),
  ],
  'missing interfaces': [
    type('T', { interfaces: null }),
  ],
  'invalid interface': [
    type('T', { interfaces: ['IUnknown'] }),
  ],
  'non-array fields': [
    type('T', {
      fields: 'bogus',
    }),
  ],
  'empty fields': [
    type('T', {
      interfaces: [],
      fields: [],
    }),
  ],
  'duplicated field name': [
    type('T', {
      fields: [field('a'), field('a')],
    }),
  ],
  'field shadows field built-in field for type': [
    type('User', {
      fields: [field('permissions')],
    }),
  ],
  'field shadows field built-in field for interface': [
    type('T', {
      interfaces: ['Node'],
      fields: [field('id')],
    }),
  ],
  'unknown field type': [
    type('T', {
      fields: [
        { name: 'b', type: 'Unknown' },
      ],
    }),
  ],
  'invalid description of a field': [
    type('T', {
      fields: [
        field('d', { description: 123 }),
      ],
    }),
  ],
  'invalid deprecationReason of a field': [
    type('T', {
      fields: [
        field('e', { deprecationReason: 123 }),
      ],
    }),
  ],
  'ofType in a scalar field': [
    type('T', {
      fields: [
        { name: 'f', type: 'Int', ofType: 'Float' },
      ],
    }),
  ],
  'ofType in an object field': [
    type('T', {
      fields: [
        { name: 'g', type: 'U', ofType: 'Float' },
      ],
    }),
    type('U'),
  ],
  'unknown ofType': [
    type('T', {
      fields: [
        { name: 'h', type: 'List', ofType: 'Unknown' },
      ],
    }),
    type('U'),
  ],
  'Node type as ofType in a list field': [
    type('T', {
      fields: [
        { name: 'i', type: 'List', ofType: 'U' },
      ],
    }),
    type('U', { interfaces: ['Node'] }),
  ],
  'non-Node type as ofType in a connection field': [
    type('T', {
      fields: [
        { name: 'j', type: 'Connection', ofType: 'U' },
      ],
    }),
    type('U'),
  ],
  'missing reverseName': [
    type('Foo', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'bar',
          type: 'Connection',
          ofType: 'Bar',
        },
      ],
    }),
    type('Bar', { interfaces: ['Node'] }),
  ],
  'unknown reverseName': [
    type('T', {
      interfaces: ['Node'],
      fields: [
        field('i', {
          type: 'Connection',
          ofType: 'U',
          reverseName: 'nonExistent',
        }),
      ],
    }),
    type('U', { interfaces: ['Node'] }),
  ],
  'non-matching reverseName in reverse field': [
    type('Bar', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'foo',
          type: 'Foo',
          reverseName: 'bars',
        },
        {
          name: 'otherFoo',
          type: 'Foo',
          reverseName: 'bars',
        },
      ],
    }),
    type('Foo', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'bars',
          type: 'Connection',
          ofType: 'Foo',
          reverseName: 'foo',
        },
      ],
    }),
  ],
  'non-matching type in reverse field': [
    type('Bar', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'foos',
          type: 'Connection',
          ofType: 'Foo',
          reverseName: 'bars',
        },
      ],
    }),
    type('Foo', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'bars',
          type: 'Connection',
          ofType: 'Foo',
          reverseName: 'foos',
        },
      ],
    }),
  ],
  'reverseName for non-connection field': [
    type('Foo', {
      interfaces: ['Node'],
      fields: [
        {
          name: 'foos',
          type: 'Connection',
          ofType: 'Foo',
          reverseName: 'bars',
        },
      ],
    }),
  ],
  'missing interface fields': [
    {
      name: 'Foo',
      kind: 'OBJECT',
      interfaces: ['Node'],
      fields: [],
    },
  ],
};


describe('validateSchema', () => {
  it('passes for a valid schema', () => {
    validateSchema(TMDbSchema, interfaces);
  });

  it('returns errors for an invalid schema', () => {
    forEach(invalidSchemas, (types, issue) => {
      assert(validateSchema({ types }, interfaces).length > 0,
        `${issue} should raise a validation error`,
      );
    });
  });

  it('reports duplicated type names', () => {
    const types = [
      type('DuplicateName'),
      type('DuplicateName'),
    ];
    const errors = validateSchema({ types }, interfaces);
    assert.deepEqual(errors, [
      'Expected type names to be unique. ' +
      'Found 2 types with name "DuplicateName"',
    ]);
  });

  it('reports missing required types', () => {
    const types = [
      type('Foo'),
    ];
    const errors = validateSchema({ types }, interfaces, ['User']);
    assert.deepEqual(errors, [
      'Expected User type to be present.',
    ]);
  });

  it('reports duplicated plural names', () => {
    const types = [
      type('Typo'),
      type('Typos'),
      type('Type', { pluralName: 'Typos' }),
    ];
    const errors = validateSchema({ types }, interfaces);
    assert.deepEqual(errors, [
      'Expected plural names of types to be unique. ' +
      'Found 3 types with plural name \"Typos\"',
    ]);
  });
});
