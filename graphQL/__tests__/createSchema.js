import { fromJS, List } from 'immutable';
import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';

import ReindexID from '../builtins/ReindexID';
import DateTime from '../builtins/DateTime';
import createInterfaces from '../builtins/createInterfaces';
import createUserTypes from '../builtins/createUserTypes';
import createSchema from '../createSchema';
import assert from '../../test/assert';

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
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'string',
            type: 'String',
          },
          {
            name: 'integer',
            type: 'Int',
          },
          {
            name: 'float',
            type: 'Float',
          },
          {
            name: 'boolean',
            type: 'Boolean',
          },
          {
            name: 'datetime',
            type: 'DateTime',
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
    assert.equal(fields.id.type.ofType, ReindexID,
      'id is converted');
    assert.equal(fields.string.type, GraphQLString,
      'string is converted');
    assert.equal(fields.integer.type, GraphQLInt,
      'integer is converted');
    assert.equal(fields.float.type, GraphQLFloat,
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
            type: 'String',
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
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'addresses',
            type: 'List',
            ofType: 'Address',
          },
          {
            name: 'homeAddress',
            type: 'Address',
          },
          {
            name: 'nicknames',
            type: 'List',
            ofType: 'String',
          },
        ],
      },
    ]));
    const userType = schema.getType('User');
    const fields = userType.getFields();
    assert.equal(fields.id.type.ofType.toString(), 'ID');
    assert.equal(fields.addresses.type.toString(), '[Address]');
    assert.equal(fields.homeAddress.type.toString(), 'Address');
    assert.equal(fields.nicknames.type.toString(), '[String]');

  });

  it('respects nonNull, description and deprecationReason', () => {
    const description = 'This is awesome. You should use it!';
    const deprecationReason = 'This sucks. Do not use it anymore.';
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        description,
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'nonNullable',
            type: 'String',
            nonNull: true,
          },
          {
            name: 'described',
            type: 'String',
            description,
          },
          {
            name: 'deprecated',
            type: 'String',
            deprecationReason,
          },
        ],
      },
    ]));
    const userType = schema.getType('User');
    const fields = userType.getFields();
    assert.instanceOf(fields.nonNullable.type, GraphQLNonNull,
      'field should use Non-Null wrapper');
    assert.equal(fields.nonNullable.type.ofType, GraphQLString,
      'wrapper should wrap the right type');
    assert.equal(fields.described.description, description,
      'field should have description');
    assert.equal(fields.deprecated.deprecationReason, deprecationReason,
      'field should have deprecationReason');

    assert.equal(userType.description, description,
      'type should have description');
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
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'microposts',
            type: 'Connection',
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
            type: 'ID',
            nonNull: true,
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
    assert.equal(micropostEdgeFields.cursor.type.toString(), 'Cursor!',
      'edges types has cursor field that is of a Cursor type');

    assert.equal(micropostFields.author.type, userType,
      'inner type is used on *-1 side');
  });

  it('creates valid inputObjects', () => {
    // TODO: when input objects are in use
  });

  it('creates builtin types', () => {
    const schema = createSchema(List());

    const reindexUser = schema.getType('ReindexUser');
    const reindexUserFields = reindexUser.getFields();
    assert.isDefined(reindexUser);

    const testUser = createUserTypes(createInterfaces()).ReindexUser.type;
    const testUserFields = testUser.getFields();

    for (const fieldName of Object.keys(testUserFields)) {
      assert.equal(
        testUserFields[fieldName].type.name,
        reindexUserFields[fieldName].type.name
      );
    }
  });

  it('creates builtin interfaces', () => {
    const schema = createSchema(List());
    const interfaces = Object.keys(createInterfaces());
    interfaces.forEach((name) => {
      assert.instanceOf(schema.getType(name), GraphQLInterfaceType);
    });
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
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'microposts',
            type: 'Connection',
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
            type: 'ID',
            nonNull: true,
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
            type: 'String',
          },
        ],
      },
    ]));

    const query = schema.getType('ReindexQueryRoot');
    const queryFields = query.getFields();
    const mutation = schema.getType('ReindexMutationRoot');
    const mutationFields = mutation.getFields();

    assert.isDefined(queryFields.getUser);
    assert.isDefined(mutationFields.createUser);
    assert.isDefined(mutationFields.deleteMicropost);


    assert.isUndefined(queryFields.getComment,
      'root fields are only created for ReindexNode types');
    assert.isUndefined(queryFields.createComment,
      'root fields are only created for ReindexNode types');

    assert.isUndefined(queryFields.createReindexUser,
      'blacklisted root fields are not created');
  });

  it('creates Relay-compliant mutations', () => {
    const schema = createSchema(fromJS([
      {
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
          {
            name: 'name',
            type: 'String',
          },
        ],
      },
      {
        kind: 'OBJECT',
        name: 'EmptyType',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
        ],
      },
    ]));


    const mutation = schema.getType('ReindexMutationRoot');
    const mutationFields = mutation.getFields();

    const createUserInput = schema.getType('_CreateUserInput');
    assert.deepEqual(mutationFields.createUser.args, [
      {
        name: 'input',
        type: createUserInput,
        description: null,
        defaultValue: null,
      },
    ], 'create mutation has one argument input');
    const createUserInputFields = createUserInput.getFields();
    assert.instanceOf(
      createUserInputFields.clientMutationId.type,
      GraphQLNonNull,
      'create input has required clientMutationId'
    );
    assert.equal(
      createUserInputFields.clientMutationId.type.ofType,
      GraphQLString,
      'create input clientMutationId field is string'
    );
    assert.isUndefined(createUserInputFields.id,
      'create input has no field id');
    assert.equal(
      createUserInputFields.User.type.ofType,
      schema.getType('_UserInput'),
      'create input has a corresponding input object field'
    );

    const updateUserInput = schema.getType('_UpdateUserInput');
    assert.deepEqual(mutationFields.updateUser.args, [
      {
        name: 'input',
        type: updateUserInput,
        description: null,
        defaultValue: null,
      },
    ], 'update mutation has one argument input');
    const updateUserInputFields = updateUserInput.getFields();
    assert.instanceOf(
      updateUserInputFields.clientMutationId.type,
      GraphQLNonNull,
      'update input has required clientMutationId'
    );
    assert.equal(
      updateUserInputFields.clientMutationId.type.ofType,
      GraphQLString,
      'update input clientMutationId field is string'
    );
    assert.instanceOf(updateUserInputFields.id.type, GraphQLNonNull,
      'update input has required field id');
    assert.equal(updateUserInputFields.id.type.ofType, ReindexID,
      'update input id field is a ID');
    assert.equal(
      updateUserInputFields.User.type.ofType,
      schema.getType('_UserInput'),
      'update input has a corresponding input object field'
    );

    const createEmptyTypeInput = schema.getType('_CreateEmptyTypeInput');
    assert.isUndefined(createEmptyTypeInput.getFields().EmptyType,
      'objects with no fields do not get input object in their input');
  });
});
