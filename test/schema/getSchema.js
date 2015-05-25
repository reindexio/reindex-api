import {Set, Map} from 'immutable';
import assert from '../assert';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import rootCalls from '../../query/rootCalls';
import getSchema from '../../schema/getSchema';
import {
  SchemaType,
  SchemaPrimitiveField,
  SchemaReverseConnectionField,
  SCHEMA_TYPES
} from '../../schema/Fields';
import {createTestDatabase, deleteTestDatabase} from '../testDatabase';

describe('getSchema', () => {
  let dbName = 'testdb_getSchema_' + uuid.v4().replace(/-/g, '_');

  before(async function () {
    let conn = await RethinkDB.connect();
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    let conn = await RethinkDB.connect();
    return await deleteTestDatabase(conn, dbName);
  });

  it('Should contain root calls and basic types', async function() {
    let conn = await RethinkDB.connect();
    let db = RethinkDB.db(dbName);

    let schema = await getSchema(db, conn);

    assert.oequal(
      schema
        .calls
        .valueSeq()
        .map((call) => call.name)
        .toSet(),
      rootCalls
        .valueSeq()
        .map((call) => call.name)
        .toSet()
    );

    let typeNames = schema.types.keySeq().toSet();

    assert(typeNames.isSuperset(Set([
      'connection', 'edges',
    ])));
  });

  it('Should contain custom types', async function() {
    let conn = await RethinkDB.connect();
    let db = RethinkDB.db(dbName);

    let schema = await getSchema(db, conn);
    let userSchema = schema.types.get('User');

    assert.oequal(
      userSchema,
      new SchemaType({
        name: 'User',
        isNode: true,
        fields: Map({
          id: new SchemaPrimitiveField({
            name: 'id',
            type: SCHEMA_TYPES.string,
          }),
          handle: new SchemaPrimitiveField({
            name: 'handle',
            type: SCHEMA_TYPES.string,
          }),
          microposts: new SchemaReverseConnectionField({
            name: 'microposts',
            reverseName: 'author',
            target: 'Micropost',
          }),
        }),
      })
    );
  });
});
