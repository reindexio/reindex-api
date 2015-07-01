import {Set, Map, List, fromJS} from 'immutable';
import assert from '../assert';
import RethinkDB from 'rethinkdb';
import uuid from 'uuid';
import getSchema from '../../schema/getSchema';
import SchemaType from '../../schema/SchemaType';
import SchemaTypeField from '../../schema/fields/SchemaTypeField';
import SchemaPrimitiveField from '../../schema/fields/SchemaPrimitiveField';
import SchemaConnectionField from '../../schema/fields/SchemaConnectionField';
import SchemaIndex from '../../schema/fields/SchemaIndex';
import {createTestDatabase, deleteTestDatabase} from '../testDatabase';

describe('getSchema', () => {
  const dbName = 'testdb_getSchema_' + uuid.v4().replace(/-/g, '_');

  before(async function () {
    const conn = await RethinkDB.connect();
    return await createTestDatabase(conn, dbName);
  });

  after(async function () {
    const conn = await RethinkDB.connect();
    return await deleteTestDatabase(conn, dbName);
  });

  it('contains basic types', async function() {
    const conn = await RethinkDB.connect();
    const db = RethinkDB.db(dbName);
    const schema = await getSchema(db, conn);

    const typeNames = schema.types.keySeq().toSet();
    assert(typeNames.isSuperset(Set([
      'connection', 'edges',
    ])));
  });

  it('contains custom types', async function() {
    const conn = await RethinkDB.connect();
    const db = RethinkDB.db(dbName);

    const schema = await getSchema(db, conn);
    const userSchema = schema.types.get('User');

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
        }),
      }),
    );
  });
});
