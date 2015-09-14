import assert from '../../../test/assert';
import buildSchemaMigration from '../buildSchemaMigration';
import {
  CreateField,
  CreateType,
  DeleteField,
  DeleteType,
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
      new CreateType('C'),
      new DeleteType('A'),
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
      new DeleteType('B'),
      new CreateType('B'),
      new DeleteType('A'),
      new CreateType('A'),
    ]);
  });

  it('creates new fields and deletes missing fields', () => {
    const commands = buildSchemaMigration(
      [
        type('T', { fields: [field('a'), field('b')] }),
      ],
      [
        type('T', { fields: [field('b'), field('c')] }),
      ],
    );
    assert.sameDeepMembers(commands, [
      new CreateField('T', 'c'),
      new DeleteField('T', 'a'),
    ]);
  });

  it('recreates fields with changed types', () => {
    const commands = buildSchemaMigration(
      [
        type('T', {
          fields: [
            field('a', { type: 'Int' }),
            field('b', { type: 'String' }),
            field('c', { type: 'Connection', ofType: 'U' }),
          ],
        }),
        type('U'),
        type('V'),
      ],
      [
        type('T', {
          fields: [
            field('a', { type: 'Float' }),
            field('b', { type: 'String' }),
            field('c', { type: 'Connection', ofType: 'V' }),
          ],
        }),
        type('U'),
        type('V'),
      ],
    );
    assert.sameDeepMembers(commands, [
      new DeleteField('T', 'a'),
      new CreateField('T', 'a'),
      new DeleteField('T', 'c'),
      new CreateField('T', 'c'),
    ]);
  });

  it('updates field info', () => {
    const commands = buildSchemaMigration(
      [
        type('T', {
          fields: [
            field('a'),
            field('b'),
            field('c', { description: 'c field' }),
          ],
        }),
      ],
      [
        type('T', {
          fields: [
            field('a', { description: 'Hello World' }),
            field('b', { deprecationReason: 'Use ReactDOM.render' }),
            field('c'),
          ],
        }),
      ],
    );
    assert.deepEqual(commands, [
      new UpdateFieldInfo('T', 'a'),
      new UpdateFieldInfo('T', 'b'),
      new UpdateFieldInfo('T', 'c'),
    ]);
  });
});
