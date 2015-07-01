import {fromJS, Map, List} from 'immutable';
import assert from '../assert';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import createSchema from '../../schema/createSchema';
import AddTypeMutator from '../../query/mutators/AddTypeMutator';
import RemoveTypeMutator from '../../query/mutators/RemoveTypeMutator';
import AddFieldMutator from '../../query/mutators/AddFieldMutator';
import RemoveFieldMutator from '../../query/mutators/RemoveFieldMutator';
import AddIndexMutator from '../../query/mutators/AddIndexMutator';
import RemoveIndexMutator from '../../query/mutators/RemoveIndexMutator';
import AddConnectionMutator from '../../query/mutators/AddConnectionMutator';
import RemoveConnectionMutator
  from '../../query/mutators/RemoveConnectionMutator';
import getSchema from '../../schema/getSchema';
import SchemaType from '../../schema/SchemaType';
import SchemaTypeField from '../../schema/fields/SchemaTypeField';
import SchemaPrimitiveField from '../../schema/fields/SchemaPrimitiveField';
import SchemaConnectionField from '../../schema/fields/SchemaConnectionField';
import SchemaNodeField from '../../schema/fields/SchemaNodeField';
import SchemaIndex from '../../schema/fields/SchemaIndex';
import {createEmptyDatabase, deleteTestDatabase} from '../testDatabase';
import {TYPE_TABLE} from '../../query/QueryConstants';

describe('Schema Updates', () => {
  const dbName = 'testdb_schema_' + uuid.v4().replace(/-/g, '_');

  before(async function () {
    const conn = await RethinkDB.connect();
    return await createEmptyDatabase(conn, dbName);
  });

  after(async function () {
    const conn = await RethinkDB.connect();
    return await deleteTestDatabase(conn, dbName);
  });

  it('creates appropriate tables when schema is created.',
     async function () {
       const conn = await RethinkDB.connect();
       const db = RethinkDB.db(dbName);
       await createSchema(db).run(conn);
       const tables = fromJS(await db.tableList().run(conn));
       assert(tables.contains(TYPE_TABLE));
     }
  );

  it('creates and deletes tables, fields and relations.',
    async function () {
      const conn = await RethinkDB.connect();
      const db = RethinkDB.db(dbName);
      await (new AddTypeMutator({name: 'User'})).toReQL(db).run(conn);
      await (new AddTypeMutator({name: 'Micropost'})).toReQL(db).run(conn);
      await (new AddFieldMutator({
        tableName: 'User',
        name: 'handle',
        type: 'string',
      })).toReQL(db).run(conn);
      await (new AddConnectionMutator({
        tableName: 'Micropost',
        targetName: 'User',
        name: 'author',
        reverseName: 'microposts',
      })).toReQL(db).run(conn);
      await (new AddIndexMutator({
        tableName: 'User',
        name: 'handle',
        fields: List(['handle']),
      })).toReQL(db).run(conn);

      let schema = await getSchema(db, conn);

      let userSchema = schema.types.get('User');
      let micropostSchema = schema.types.get('Micropost');

      assert.oequal(userSchema, new SchemaType({
        name: 'User',
        isNode: true,
        fields: Map({
          __type__: new SchemaTypeField({
            name: '__type__',
            type: fromJS({
              fields: [
                {
                  name: '__type__',
                  type: 'type',
                },
                {
                  name: 'id',
                  type: 'string',
                },
                {
                  name: 'handle',
                  type: 'string',
                },
                {
                  name: 'microposts',
                  reverseName: 'author',
                  target: 'Micropost',
                  type: 'connection',
                },
              ],
              isNode: true,
              name: 'User',
              parameters: [],
              indexes: [
                {
                  name: 'id',
                  fields: [
                    {
                      name: 'id',
                    },
                  ],
                },
                {
                  name: 'handle',
                  fields: [
                    {
                      name: 'handle',
                    },
                  ],
                },
              ],
            }),
          }),
          id: new SchemaPrimitiveField({
            name: 'id',
            type: 'string',
          }),
          handle: new SchemaPrimitiveField({
            name: 'handle',
            type: 'string',
          }),
          microposts: new SchemaConnectionField({
            name: 'microposts',
            reverseName: 'author',
            type: 'Micropost',
          }),
        }),
        indexes: Map({
          id: new SchemaIndex({
            name: 'id',
            fields: List([
              Map({
                name: 'id',
              }),
            ]),
          }),
          handle: new SchemaIndex({
            name: 'handle',
            fields: List([
              Map({
                name: 'handle',
              }),
            ]),
          }),
        }),
      }));

      assert.oequal(micropostSchema, new SchemaType({
        name: 'Micropost',
        isNode: true,
        fields: Map({
          __type__: new SchemaTypeField({
            name: '__type__',
            type: fromJS({
              fields: [
                {
                  name: '__type__',
                  type: 'type',
                },
                {
                  name: 'id',
                  type: 'string',
                },
                {
                  name: 'author',
                  reverseName: 'microposts',
                  type: 'User',
                },
              ],
              isNode: true,
              name: 'Micropost',
              parameters: [],
              indexes: [
                {
                  name: 'id',
                  fields: [
                    {
                      name: 'id',
                    },
                  ],
                },
                {
                  name: 'author',
                  fields: [
                    {
                      name: 'author',
                    },
                  ],
                },
              ],
            }),
          }),
          id: new SchemaPrimitiveField({
            name: 'id',
            type: 'string',
          }),
          author: new SchemaNodeField({
            name: 'author',
            reverseName: 'microposts',
            type: 'User',
          }),
        }),
        indexes: Map({
          id: new SchemaIndex({
            name: 'id',
            fields: List([
              Map({
                name: 'id',
              }),
            ]),
          }),
         author: new SchemaIndex({
            name: 'author',
            fields: List([
              Map({
                name: 'author',
              }),
            ]),
          }),
        }),
      }));

      await (new RemoveFieldMutator({
        tableName: 'User',
        name: 'handle',
      })).toReQL(db).run(conn);
      await (new RemoveIndexMutator({
        tableName: 'User',
        name: 'handle',
      })).toReQL(db).run(conn);
      await (new RemoveConnectionMutator({
        tableName: 'Micropost',
        targetName: 'User',
        name: 'author',
        reverseName: 'microposts',
      })).toReQL(db).run(conn);

      schema = await getSchema(db, conn);
      userSchema = schema.types.get('User');
      micropostSchema = schema.types.get('Micropost');

      assert.oequal(userSchema, new SchemaType({
        name: 'User',
        isNode: true,
        fields: Map({
          __type__: new SchemaTypeField({
            name: '__type__',
            type: fromJS({
              fields: [
                {
                  name: '__type__',
                  type: 'type',
                },
                {
                  name: 'id',
                  type: 'string',
                },
              ],
              isNode: true,
              name: 'User',
              parameters: [],
              indexes: [
                {
                  name: 'id',
                  fields: [
                    {
                      name: 'id',
                    },
                  ],
                },
              ],
            }),
          }),
          id: new SchemaPrimitiveField({
            name: 'id',
            type: 'string',
          }),
        }),
        indexes: Map({
          id: new SchemaIndex({
            name: 'id',
            fields: List([
              Map({
                name: 'id',
              }),
            ]),
          }),
        }),
      }));

      assert.oequal(micropostSchema, new SchemaType({
        name: 'Micropost',
        isNode: true,
        fields: Map({
          __type__: new SchemaTypeField({
            name: '__type__',
            type: fromJS({
              fields: [
                {
                  name: '__type__',
                  type: 'type',
                },
                {
                  name: 'id',
                  type: 'string',
                },
              ],
              isNode: true,
              name: 'Micropost',
              parameters: [],
              indexes: [
                {
                  name: 'id',
                  fields: [
                    {
                      name: 'id',
                    },
                  ],
                },
              ],
            }),
          }),
          id: new SchemaPrimitiveField({
            name: 'id',
            type: 'string',
          }),
        }),
        indexes: Map({
          id: new SchemaIndex({
            name: 'id',
            fields: List([
              Map({
                name: 'id',
              }),
            ]),
          }),
        }),
      }));

      await (new RemoveTypeMutator({name: 'User'})).toReQL(db).run(conn);
      await (new RemoveTypeMutator({name: 'Micropost'})).toReQL(db).run(conn);

      schema = await getSchema(db, conn);
      userSchema = schema.types.get('User');
      micropostSchema = schema.types.get('Micropost');

      assert.isUndefined(userSchema);
      assert.isUndefined(micropostSchema);
    }
  );
});
