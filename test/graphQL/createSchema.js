import {fromJS} from 'immutable';
import assert from '../assert';
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import {DateTime} from '../../graphQL/builtIns';
import defaultSetup from '../../graphQL/defaultSetup';
import createSchema from '../../graphQL/createSchema';

describe('createSchema', () => {
  it('creates types with appropriate scalar fields', () => {
    const schema = createSchema(defaultSetup, fromJS([
      {
        name: 'User',
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

    const fields = userType.getFields();
    assert.equal(fields.id.type, GraphQLID,
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

  it('respects non-nullness', () => {
    const schema = createSchema(defaultSetup, fromJS([
      {
        name: 'User',
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
    assert.equal(fields.id.type.ofType, GraphQLID);
  });

  it('creates appropriate connections', () => {
    const schema = createSchema(defaultSetup, fromJS([
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'id',
            isRequired: true,
          },
          {
            name: 'microposts',
            type: 'connection',
            target: 'Micropost',
            reverseName: 'author',
          },
        ],
      },
      {
        name: 'Micropost',
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
      'connection type nodes field is a list of target type');
    assert.instanceOf(micropostConnectionFields.edges.type, GraphQLList,
      'connection type has edges field that is a list');
    assert.equal(micropostConnectionFields.edges.type.ofType, micropostEdge,
      'connection type edges field is a list of edges');
    assert.equal(micropostEdgeFields.node.type, micropostType,
      'edges type has node field that is target type');

    // TODO: cursor

    assert.equal(micropostFields.author.type, userType,
      'target type is used on *-1 side');
  });

  it('creates valid inputObjects', () => {
    // TODO: when input objects are in use
  });

  it('creates valid types for editable types', () => {
    // TODO: when types are editable
  });

  it('creates valid types for editable fields', () => {
    // TODO: when fields are editable
  });
});
