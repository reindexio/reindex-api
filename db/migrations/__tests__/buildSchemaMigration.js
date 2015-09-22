import assert from '../../../test/assert';
import buildSchemaMigration from '../buildSchemaMigration';
import {
  CreateField,
  CreateType,
  CreateTypeData,
  DeleteField,
  DeleteFieldData,
  DeleteType,
  DeleteTypeData,
  UpdateFieldInfo,
} from '../commands';
import { field, type } from './helpers';

describe('buildSchemaMigration', () => {
  it('creates new types and deletes missing types', () => {
    const commands = buildSchemaMigration(
      [
        type('A'),
        type('B'),
      ],
      [
        type('B'),
        type('C'),
      ],
    );
    assert.sameDeepMembers(commands, [
      new CreateType(type('C')),
      new DeleteType(type('A')),
    ]);
  });

  it('recreates types with changed interfaces', () => {
    const commands = buildSchemaMigration(
      [
        type('A', { interfaces: ['Node'] }),
        type('B'),
      ],
      [
        type('A'),
        type('B', { interfaces: ['Node'] }),
      ],
    );
    assert.sameDeepMembers(commands, [
      new DeleteType(type('B')),
      new CreateType(type('B', { interfaces: ['Node'] })),
      new CreateTypeData(type('B', { interfaces: ['Node'] })),
      new DeleteType(type('A', { interfaces: ['Node'] })),
      new DeleteTypeData(type('A', { interfaces: ['Node'] })),
      new CreateType(type('A')),
      new CreateField(type('B', { interfaces: ['Node'] }), 'id', 'ID', {
        nonNull: true,
      }),
    ]);
  });

  it('recreates fields for deleted types', () => {
    const prevType = type('A', { interfaces: [], fields: [field('a')] });
    const nextType = type('A', { interfaces: ['Node'], fields: [field('a')] });
    const commands = buildSchemaMigration([prevType], [nextType]);
    assert.sameDeepMembers(commands, [
      new DeleteType(prevType),
      new CreateType(nextType),
      new CreateTypeData(nextType),
      new CreateField(nextType, 'a', 'Int'),
      new CreateField(nextType, 'id', 'ID', {
        nonNull: true,
      }),
    ]);
  });

  it('creates data deletion for deleted fields', () => {
    const notUsedInline = type('FI', { fields: [field('b')] });
    const inlineType = type('I', { fields: [field('a')] });
    const nestedInlineType = type('NI', {
      fields: [field('inline', { type: 'I' })],
    });
    const nodeType = type('T', {
      interfaces: ['Node'],
      fields: [
        field('normal'),
        field('inline', { type: 'I' }),
        field('list', { type: 'List', ofType: 'I' }),
        field('nested', { type: 'NI' }),
      ],
    });

    const modifiedInline = type('I');
    const modifiedNode = type('T', {
      interfaces: ['Node'],
      fields: [
        field('inline', { type: 'I' }),
        field('list', { type: 'List', ofType: 'I' }),
        field('nested', { type: 'NI' }),
      ],
    });
    const modifiedNotUsedInline = type('FI');

    const commands = buildSchemaMigration(
      [inlineType, nestedInlineType, nodeType, notUsedInline],
      [modifiedInline, nestedInlineType, modifiedNode, modifiedNotUsedInline]
    );

    assert.sameDeepMembers(commands, [
      new DeleteField(inlineType, 'a'),
      new DeleteField(nodeType, 'normal'),
      new DeleteField(notUsedInline, 'b'),
      new DeleteFieldData(nodeType, ['normal']),
      new DeleteFieldData(nodeType, ['inline', 'a']),
      new DeleteFieldData(nodeType, ['list', 'a']),
      new DeleteFieldData(nodeType, ['nested', 'inline', 'a']),
    ]);
  });

  it('creates new fields and deletes missing fields', () => {
    const prevType = type('T', { fields: [field('a'), field('b')] });
    const nextType = type('T', { fields: [field('b'), field('c')] });
    const commands = buildSchemaMigration([prevType], [nextType]);
    assert.sameDeepMembers(commands, [
      new CreateField(prevType, 'c', 'Int', {}),
      new DeleteField(prevType, 'a'),
    ]);
  });

  it('recreates fields with changed types', () => {
    const prevType = type('T', {
      interfaces: ['Node'],
      fields: [
        field('a', { type: 'Int' }),
        field('b', { type: 'String' }),
        field('c', { type: 'Connection', ofType: 'U' }),
      ],
    });
    const nextType = type('T', {
      interfaces: ['Node'],
      fields: [
        field('a', { type: 'Float' }),
        field('b', { type: 'String' }),
        field('c', { type: 'Connection', ofType: 'V' }),
      ],
    });

    const commands = buildSchemaMigration(
      [
        prevType,
        type('U'),
        type('V'),
      ],
      [
        nextType,
        type('U'),
        type('V'),
      ],
    );

    assert.sameDeepMembers(commands, [
      new DeleteField(prevType, 'a'),
      new DeleteField(prevType, 'c'),
      new DeleteFieldData(prevType, ['a']),
      new DeleteFieldData(prevType, ['c']),
      new CreateField(prevType, 'a', 'Float'),
      new CreateField(prevType, 'c', 'Connection', { ofType: 'V' }),
    ]);
  });

  it('updates field info', () => {
    const prevType = type('T', {
      fields: [
        field('a'),
        field('b'),
        field('c', { description: 'c field' }),
      ],
    });
    const nextType = type('T', {
      fields: [
        field('a', { description: 'Hello World' }),
        field('b', { deprecationReason: 'Use ReactDOM.render' }),
        field('c'),
      ],
    });

    const commands = buildSchemaMigration([prevType], [nextType]);

    assert.deepEqual(commands, [
      new UpdateFieldInfo(prevType, 'a', { description: 'Hello World' }),
      new UpdateFieldInfo(prevType, 'b', {
        deprecationReason: 'Use ReactDOM.render',
      }),
      new UpdateFieldInfo(prevType, 'c', {}),
    ]);
  });
});
