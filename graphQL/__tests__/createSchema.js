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
import createSecret from '../builtins/createSecret';
import injectDefaultFields from '../builtins/injectDefaultFields';
import createSchema from '../createSchema';
import assert from '../../test/assert';

describe('createSchema', () => {
  function injectAndCreateSchema(data) {
    if (!data.find((type) => type.name === 'User')) {
      data = data.concat([{
        kind: 'OBJECT',
        name: 'User',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
        ],
      }]);
    }
    return createSchema(data.map((type) => ({
      ...type,
      fields: injectDefaultFields(type),
    })));
  }

  it('creates types with appropriate scalar fields', () => {
    const schema = injectAndCreateSchema([
      {
        kind: 'OBJECT',
        name: 'Person',
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
    ]);

    const personType = schema.getType('Person');
    assert.equal(personType.name, 'Person');
    assert.instanceOf(personType, GraphQLObjectType,
      'type is created');
    assert.include(personType.getInterfaces(), schema.getType('Node'),
      'type implements Node interface');

    const fields = personType.getFields();
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
    const schema = injectAndCreateSchema([
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
        name: 'Person',
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
          {
            name: 'phoneNumbers',
            type: 'List',
            ofType: 'String',
            nonNull: true,
          },
        ],
      },
    ]);
    const personType = schema.getType('Person');
    const fields = personType.getFields();
    assert.equal(fields.addresses.type.toString(), '[Address]');
    assert.equal(fields.homeAddress.type.toString(), 'Address');
    assert.equal(fields.nicknames.type.toString(), '[String]');
    assert.equal(fields.phoneNumbers.type.toString(), '[String]!');
  });

  it('respects nonNull, description and deprecationReason', () => {
    const description = 'This is awesome. You should use it!';
    const deprecationReason = 'This sucks. Do not use it anymore.';
    const schema = injectAndCreateSchema([
      {
        kind: 'OBJECT',
        name: 'Person',
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
    ]);
    const personType = schema.getType('Person');
    const fields = personType.getFields();
    assert.instanceOf(fields.nonNullable.type, GraphQLNonNull,
      'field should use Non-Null wrapper');
    assert.equal(fields.nonNullable.type.ofType, GraphQLString,
      'wrapper should wrap the right type');
    assert.equal(fields.described.description, description,
      'field should have description');
    assert.equal(fields.deprecated.deprecationReason, deprecationReason,
      'field should have deprecationReason');

    assert.equal(personType.description, description,
      'type should have description');
  });

  it('creates appropriate connections', () => {
    const schema = injectAndCreateSchema([
      {
        kind: 'OBJECT',
        name: 'Person',
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
            type: 'Person',
            reverseName: 'microposts',
          },
        ],
      },
    ]);

    const personType = schema.getType('Person');
    const personFields = personType.getFields();
    const micropostType = schema.getType('Micropost');
    const micropostFields = micropostType.getFields();
    const micropostConnection = schema.getType('_MicropostConnection');
    const micropostConnectionFields = micropostConnection.getFields();
    const micropostEdge = schema.getType('_MicropostEdge');
    const micropostEdgeFields = micropostEdge.getFields();

    assert.equal(personFields.microposts.type, micropostConnection,
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

    assert.equal(micropostFields.author.type, personType,
      'inner type is used on *-1 side');
  });

  it('creates valid inputObjects', () => {
    // TODO: when input objects are in use
  });

  it('creates builtin types', () => {
    const schema = injectAndCreateSchema([]);

    const reindexSecret = schema.getType('ReindexSecret');
    const reindexSecretFields = reindexSecret.getFields();
    assert.isDefined(reindexSecret);

    const testSecret = createSecret(createInterfaces()).type;
    const testSecretFields = testSecret.getFields();

    for (const fieldName of Object.keys(testSecretFields)) {
      assert.equal(
        testSecretFields[fieldName].type.name,
        reindexSecretFields[fieldName].type.name
      );
    }
  });

  it('creates builtin interfaces', () => {
    const schema = injectAndCreateSchema([]);
    const interfaces = Object.keys(createInterfaces());
    interfaces.forEach((name) => {
      assert.instanceOf(schema.getType(name), GraphQLInterfaceType);
    });
  });

  it('creates root fields', () => {
    const schema = injectAndCreateSchema([
      {
        kind: 'OBJECT',
        name: 'Person',
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
            type: 'Person',
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
      {
        kind: 'OBJECT',
        name: 'Cactus',
        pluralName: 'Cacti',
        interfaces: ['Node'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            nonNull: true,
          },
        ],
      },
    ]);

    const query = schema.getType('ReindexQueryRoot');
    const queryFields = query.getFields();
    const mutation = schema.getType('ReindexMutationRoot');
    const mutationFields = mutation.getFields();

    assert.isDefined(queryFields.getPerson);
    assert.isDefined(mutationFields.createPerson);
    assert.isDefined(mutationFields.deleteMicropost);

    const viewerFields = schema.getType('ReindexViewer').getFields();
    assert.isDefined(viewerFields.allPeople,
      'all nodes field');
    assert.isDefined(viewerFields.allCacti,
      'all nodes field with custom plural');

    assert.isUndefined(queryFields.getComment,
      'root fields are only created for ReindexNode types');
    assert.isUndefined(queryFields.createComment,
      'root fields are only created for ReindexNode types');
  });

  it('creates Relay-compliant mutations', () => {
    const schema = injectAndCreateSchema([
      {
        kind: 'OBJECT',
        name: 'Person',
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
          {
            name: 'nonnull',
            type: 'String',
            nonNull: true,
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
    ]);

    const mutation = schema.getType('ReindexMutationRoot');
    const mutationFields = mutation.getFields();

    const createPersonInput = schema.getType('_CreatePersonInput');
    assert.deepEqual(mutationFields.createPerson.args, [
      {
        name: 'input',
        type: new GraphQLNonNull(createPersonInput),
        description: null,
        defaultValue: null,
      },
    ], 'create mutation has one argument input');
    const createPersonInputFields = createPersonInput.getFields();
    assert.equal(
      createPersonInputFields.clientMutationId.type,
      GraphQLString,
      'create input clientMutationId field is string'
    );
    assert.isUndefined(createPersonInputFields.id,
      'create input has no field id');
    assert.equal(
      createPersonInputFields.name.type,
      GraphQLString,
      'create input has a name field'
    );
    assert.instanceOf(
      createPersonInputFields.nonnull.type,
      GraphQLNonNull,
      'create input preserves nonNull field'
    );

    const updatePersonInput = schema.getType('_UpdatePersonInput');
    assert.deepEqual(mutationFields.updatePerson.args, [
      {
        name: 'input',
        type: new GraphQLNonNull(updatePersonInput),
        description: null,
        defaultValue: null,
      },
    ], 'update mutation has one argument input');
    const updatePersonInputFields = updatePersonInput.getFields();
    assert.equal(
      updatePersonInputFields.clientMutationId.type,
      GraphQLString,
      'update input clientMutationId field is string'
    );
    assert.instanceOf(updatePersonInputFields.id.type, GraphQLNonNull,
      'update input has required field id');
    assert.equal(updatePersonInputFields.id.type.ofType, ReindexID,
      'update input id field is a ID');
    assert.equal(
      updatePersonInputFields.nonnull.type,
      GraphQLString,
      'update input does not preserve nonNull field'
    );
  });
});
