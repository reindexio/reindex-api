import { omit } from 'lodash';
import uuid from 'uuid';
import RethinkDB from 'rethinkdb';

import { getTypes } from '../simpleQueries';
import { performMigration } from '../migrationQueries';
import {
  CreateType,
  CreateTypeData,
  DeleteType,
  DeleteTypeData,
  CreateField,
  DeleteField,
  DeleteFieldData,
  UpdateFieldInfo,
} from '../../migrations/commands';
import assert from '../../../test/assert';
import createApp from '../../createApp';

describe('Migration queries', () => {
  const host = 'testdb.' + uuid.v4().replace(/-/g, '_') + 'example.com';
  let dbName;
  let conn;

  before(async () => {
    dbName = (await createApp(host)).dbName;
    conn = await RethinkDB.connect({ db: dbName });
  });

  after(async () => {
    await RethinkDB.dbDrop(dbName).run(conn);
    await conn.close();
  });

  it('creates types and table', async () => {
    const { typesNoIDs } = await getTypesNoIDs(conn);

    const nodeType = {
      name: 'TestNodeType',
      interfaces: ['Node'],
      kind: 'OBJECT',
    };

    await performMigration(conn, [
      new CreateType(nodeType),
      new CreateTypeData(nodeType),
      new CreateType({
        name: 'TestInlineType',
        interfaces: [],
        kind: 'OBJECT',
      }),
      new CreateField(nodeType, 'id', 'ID', {
        nonNull: true,
      }),
      new CreateField(nodeType, 'testField', 'String', {
        description: 'Some description',
      }),
    ]);

    const newTypes = await getTypesNoIDs(conn);
    assert.deepEqual(newTypes.typesNoIDs, [
      {
        name: 'TestInlineType',
        interfaces: [],
        kind: 'OBJECT',
        fields: [],
      },
      {
        name: 'TestNodeType',
        interfaces: ['Node'],
        kind: 'OBJECT',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'testField',
            type: 'String',
            description: 'Some description',
          },
        ],
      },
      ...typesNoIDs,
    ]);

    const tableList = await RethinkDB.tableList().run(conn);
    assert(tableList.includes('TestNodeType'));
    assert(!tableList.includes('TestInlineType'));
  });

  it('adds and updates fields', async () => {
    const { types, typesNoIDs } = await getTypesNoIDs(conn);
    const nodeType = types.find((type) => type.name === 'TestNodeType');
    const inlineType = types.find((type) => type.name === 'TestInlineType');
    await performMigration(conn, [
      new CreateField(inlineType, 'testField2', 'String', {
        description: 'Test description',
      }),
      new CreateField(nodeType, 'testInlineField', 'TestInlineType'),
      new UpdateFieldInfo(nodeType, 'testField', {
        nonNull: false,
        deprecationReason: 'No reason',
      }),
    ]);

    const newTypes = await getTypesNoIDs(conn);

    assert.deepEqual(newTypes.typesNoIDs, [
      {
        name: 'TestInlineType',
        interfaces: [],
        kind: 'OBJECT',
        fields: [
          {
            name: 'testField2',
            type: 'String',
            description: 'Test description',
          },
        ],
      },
      {
        name: 'TestNodeType',
        interfaces: ['Node'],
        kind: 'OBJECT',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'testField',
            type: 'String',
            nonNull: false,
            deprecationReason: 'No reason',
          },
          {
            name: 'testInlineField',
            type: 'TestInlineType',
          },
        ],
      },
      typesNoIDs[2],
    ]);
  });

  it('deletes fields and data', async () => {
    await RethinkDB.table('TestNodeType').insert({
      testField: 'foo',
      testInlineField: {
        testField2: 'bar',
      },
      testInlineField2: {
        testField3: 'brash',
        testNestedInline: {
          testField2: 'bar',
        },
      },
      testListField: [
        {
          testField2: 'bar',
        },
        {
          testField2: 'bar',
        },
      ],
    }).run(conn);

    let { types, typesNoIDs } = await getTypesNoIDs(conn);

    let nodeType = types.find((type) => type.name === 'TestNodeType');
    let inlineType = types.find((type) => type.name === 'TestInlineType');
    const inlineType2 = {
      name: 'TestInlineType2',
      interfaces: [],
      kind: 'OBJECT',
    };

    await performMigration(conn, [
      new CreateType(inlineType2, []),
      new CreateField(inlineType2, 'testField3', 'String'),
      new CreateField(inlineType2, 'testNestedInline', 'TestInlineType'),
      new CreateField(nodeType, 'testInlineField2', 'TestInlineType2'),
      new CreateField(nodeType, 'testListField', 'List', {
        ofType: 'TestInlineType',
      }),
    ]);

    ({ types, typesNoIDs } = await getTypesNoIDs(conn));

    nodeType = types.find((type) => type.name === 'TestNodeType');
    inlineType = types.find((type) => type.name === 'TestInlineType');

    await performMigration(conn, [
      new DeleteField(nodeType, 'testField'),
      new DeleteField(inlineType, 'testField2'),
      new DeleteFieldData(nodeType, ['testField']),
      new DeleteFieldData(nodeType, ['testInlineField', 'testField2']),
      new DeleteFieldData(nodeType, [
        'testInlineField2', 'testNestedInline', 'testField2',
      ]),
      new DeleteFieldData(nodeType, [
        'testListField', 'testField2',
      ]),
    ]);

    const newTypes = await getTypesNoIDs(conn);
    assert.deepEqual(newTypes.typesNoIDs, [
      {
        name: 'TestInlineType',
        interfaces: [],
        kind: 'OBJECT',
        fields: [],
      },
      {
        name: 'TestInlineType2',
        interfaces: [],
        kind: 'OBJECT',
        fields: [
          {
            name: 'testField3',
            type: 'String',
          },
          {
            name: 'testNestedInline',
            type: 'TestInlineType',
          },
        ],
      },
      {
        name: 'TestNodeType',
        interfaces: ['Node'],
        kind: 'OBJECT',
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'testInlineField',
            type: 'TestInlineType',
          },
          {
            name: 'testInlineField2',
            type: 'TestInlineType2',
          },
          {
            name: 'testListField',
            type: 'List',
            ofType: 'TestInlineType',
          },
        ],
      },
      typesNoIDs[3],
    ]);

    assert.deepEqual(await RethinkDB
      .table('TestNodeType')
      .without('id')
      .nth(0)
      .run(conn), {
        testInlineField: {},
        testInlineField2: {
          testField3: 'brash',
          testNestedInline: {},
        },
        testListField: [
          {},
          {},
        ],
      }
    );
  });

  it('delete types and tables', async () => {
    const { types, typesNoIDs } = await getTypesNoIDs(conn);

    const nodeType = types.find((type) => type.name === 'TestNodeType');

    await performMigration(conn, [
      new DeleteType(nodeType),
      new DeleteTypeData(nodeType),
    ]);

    const newTypes = await getTypesNoIDs(conn);

    assert.deepEqual(newTypes.typesNoIDs, [
      {
        name: 'TestInlineType',
        interfaces: [],
        kind: 'OBJECT',
        fields: [],
      },
      {
        name: 'TestInlineType2',
        interfaces: [],
        kind: 'OBJECT',
        fields: [
          {
            name: 'testField3',
            type: 'String',
          },
          {
            name: 'testNestedInline',
            type: 'TestInlineType',
          },
        ],
      },
      typesNoIDs[3],
    ]);

    const tableList = await RethinkDB.tableList().run(conn);
    assert(!tableList.includes('TestNodeType'));
  });
});

async function getTypesNoIDs(conn) {
  const types = await getTypes(conn);
  return {
    types,
    typesNoIDs: types.map((type) => omit(type, 'id')),
  };
}
