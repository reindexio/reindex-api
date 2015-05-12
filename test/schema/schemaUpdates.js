import {fromJS, Map} from 'immutable';
import assert from '../assert';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import createSchema from '../../schema/createSchema';
import createType from '../../schema/createType';
import deleteType from '../../schema/deleteType';
import getSchema from '../../schema/getSchema';
import {
  SchemaType,
  SchemaPrimitiveField,
  SCHEMA_TYPES
} from '../../schema/Fields';
import {createEmptyDatabase, deleteTestDatabase} from '../testDatabase';

describe('Schema Updates', () => {
  let dbName = 'testdb_schema_' + uuid.v4().replace(/-/g, '_');

  before(async function () {
    let conn = await RethinkDB.connect();
    return await createEmptyDatabase(conn, dbName);
  });

  after(async function () {
    let conn = await RethinkDB.connect();
    return await deleteTestDatabase(conn, dbName);
  });

  it('Should create appropriate tables when schema is created.',
     async function () {
       let conn = await RethinkDB.connect();
       let db = RethinkDB.db(dbName);
       await createSchema(db).run(conn);
       let tables = fromJS(await db.tableList().run(conn));
       assert(tables.contains('_types'));
     }
  );

  it('Should add both table and metadata when type is created.',
    async function () {
      let conn = await RethinkDB.connect();
      let db = RethinkDB.db(dbName);
      await createType(db, 'User').run(conn);

      let schema = await getSchema(db, conn);
      let userSchema = schema.types.get('User');

      assert.oequal(userSchema, new SchemaType({
        name: 'User',
        fields: Map({
          id: new SchemaPrimitiveField({
            name: 'id',
            type: SCHEMA_TYPES.string,
          }),
        }),
        methods: Map(),
      }));

      await deleteType(db, 'User').run(conn);
    }
  );

  it('Should delete both table and metadata when type is deleted',
    async function () {
      let conn = await RethinkDB.connect();
      let db = RethinkDB.db(dbName);
      await createType(db, 'User').run(conn);

      let schema = await getSchema(db, conn);
      let userSchema = schema.types.get('User');

      assert.isDefined(userSchema);

      await deleteType(db, 'User').run(conn);

      schema = await getSchema(db, conn);
      userSchema = schema.types.get('User');

      assert.isUndefined(userSchema);
    }
  );
});
