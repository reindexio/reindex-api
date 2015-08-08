import {fromJS} from 'immutable';
import assert from '../assert';
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import ReindexID from '../../graphQL/builtins/ReindexID';
import DateTime from '../../graphQL/builtins/DateTime';
import createSchema from '../../graphQL/createSchema';
import createInterfaces from '../../graphQL/builtins/createInterfaces';
import createUser from '../../graphQL/builtins/createUser';

describe('createSchema', () => {
  it('creates types with appropriate scalar fields', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
          },
          {
            name: 'string',
            type: 'string',
          },
          {
            name: 'integer',
            type: 'integer',
          },
          {
            name: 'number',
            type: 'number',
          },
          {
            name: 'boolean',
            type: 'boolean',
          },
          {
            name: 'datetime',
            type: 'datetime',
          },
        ],
      },
    ]));

    const userType = schema.getType('User');
    assert.equal(userType.name, 'User');
    assert.instanceOf(userType, GraphQLObjectType,
      'type is created');
    assert.include(userType.getInterfaces(), schema.getType('Node'),
      'type implements Node interface');

    const fields = userType.getFields();
    assert.equal(fields.id.type, ReindexID,
      'id is converted');
    assert.equal(fields.string.type, GraphQLString,
      'string is converted');
    assert.equal(fields.integer.type, GraphQLInt,
      'integer is converted');
    assert.equal(fields.number.type, GraphQLFloat,
      'number is converted');
    assert.equal(fields.boolean.type, GraphQLBoolean,
      'boolean is converted');
    assert.equal(fields.datetime.type, DateTime,
      'datetime is converted');
  });

  it('creates list and object fields', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'Address',
        interfaces: [],
        fields: [
          {
            name: 'street',
            type: 'string',
          },
        ],
      },
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
          },
          {
            name: 'addresses',
            type: 'list',
            ofType: 'Address',
          },
          {
            name: 'homeAddress',
            type: 'Address',
          },
          {
            name: 'nicknames',
            type: 'list',
            ofType: 'string',
          },
        ],
      },
    ]));
    const userType = schema.getType('User');
    const fields = userType.getFields();
    assert.equal(fields.id.type.toString(), 'ID');
    assert.equal(fields.addresses.type.toString(), '[Address]');
    assert.equal(fields.homeAddress.type.toString(), 'Address');
    assert.equal(fields.nicknames.type.toString(), '[String]');

  });

  it('respects non-nullness', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
        ],
      },
    ]));

    const fields = schema.getType('User').getFields();
    assert.instanceOf(fields.id.type, GraphQLNonNull);
    assert.equal(fields.id.type.ofType, ReindexID);
  });

  it('creates appropriate connections', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
          {
            name: 'microposts',
            type: 'connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
      },
      {
        kind: 'OBJECT',
        name: 'Micropost',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
          {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
      },
    ]));

    const userType = schema.getType('User');
    const userFields = userType.getFields();
    const micropostType = schema.getType('Micropost');
    const micropostFields = micropostType.getFields();
    const micropostConnection = schema.getType('_MicropostConnection');
    const micropostConnectionFields = micropostConnection.getFields();
    const micropostEdge = schema.getType('_MicropostEdge');
    const micropostEdgeFields = micropostEdge.getFields();

    assert.equal(userFields.microposts.type, micropostConnection,
      'connection type is used on 1-* side');
    assert.equal(micropostConnectionFields.count.type, GraphQLInt,
      'connection type has count field');
    assert.instanceOf(micropostConnectionFields.nodes.type, GraphQLList,
      'connection type has nodes field that is a list');
    assert.equal(micropostConnectionFields.nodes.type.ofType, micropostType,
      'connection type nodes field is a list of inner type');
    assert.instanceOf(micropostConnectionFields.edges.type, GraphQLList,
      'connection type has edges field that is a list');
    assert.equal(micropostConnectionFields.edges.type.ofType, micropostEdge,
      'connection type edges field is a list of edges');
    assert.equal(micropostEdgeFields.node.type, micropostType,
      'edges type has node field that is of inner type');

    // TODO: cursor

    assert.equal(micropostFields.author.type, userType,
      'inner type is used on *-1 side');
  });

  it('creates valid inputObjects', () => {
    // TODO: when input objects are in use
  });

  it('creates builtin types', () => {
    const schema = createSchema(fromJS([]));

    const reindexUser = schema.getType('ReindexUser');
    const reindexUserFields = reindexUser.getFields();
    assert.isDefined(reindexUser);

    const testUser = createUser(createInterfaces()).type;
    const testUserFields = testUser.getFields();

    for (const fieldName of Object.keys(testUserFields)) {
      assert.equal(
        testUserFields[fieldName].type.name,
        reindexUserFields[fieldName].type.name
      );
    }
  });

  it('creates root fields', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
          {
            name: 'microposts',
            type: 'connection',
            ofType: 'Micropost',
            reverseName: 'author',
          },
        ],
      },
      {
        kind: 'OBJECT',
        name: 'Micropost',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
          {
            name: 'author',
            type: 'User',
            reverseName: 'microposts',
          },
        ],
      },
      {
        kind: 'OBJECT',
        name: 'Comment',
        interfaces: [],
        fields: [
          {
            name: 'text',
            type: 'string',
          },
        ],
      },
    ]));

    const query = schema.getType('ReindexQuery');
    const queryFields = query.getFields();
    const mutation = schema.getType('ReindexMutation');
    const mutationFields = mutation.getFields();

    assert.isDefined(queryFields.getUser);
    assert.isDefined(queryFields.searchForMicropost);
    assert.isDefined(mutationFields.createUser);
    assert.isDefined(mutationFields.deleteMicropost);

    assert.isUndefined(queryFields.getComment,
      'root fields are only created for Node types');
    assert.isUndefined(queryFields.createComment,
      'root fields are only created for Node types');

    assert.isUndefined(queryFields.createReindexUser,
      'blacklisted root fields are not created');
  });
});
