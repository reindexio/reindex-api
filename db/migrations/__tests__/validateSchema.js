import { forEach } from 'lodash';

import assert from '../../../test/assert';
import validateSchema from '../validateSchema';
import { field, type } from './helpers';

import TMDbSchema from './fixtures/TMDbSchema';

const interfaces = { Node: true };

const invalidSchemas = {
  'duplicated type name': [
    type('T'),
    type('T'),
  ],
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
  'invalid isRequired': [
    type('T', {
      fields: [
        field('c', { isRequired: 'true' }),
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
});
