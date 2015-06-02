import {Set, Map, fromJS} from 'immutable';
import assert from '../assert';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import getSchema from '../../schema/getSchema';
import SchemaType from '../../schema/SchemaType';
import SchemaTypeField from '../../schema/fields/SchemaTypeField';
import SchemaPrimitiveField from '../../schema/fields/SchemaPrimitiveField';
import SchemaConnectionField from '../../schema/fields/SchemaConnectionField';
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

  it('Should contain basic types', async function() {
    let conn = await RethinkDB.connect();
    let db = RethinkDB.db(dbName);
    let schema = await getSchema(db, conn);

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
      })
    );
  });
});
