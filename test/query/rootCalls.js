import {Map} from 'immutable';
import assert from '../assert';
import rootCalls from '../../query/rootCalls';
import testSchema from '../testSchema';

function processAndCall(rootCall, parameters) {
  let processedParameters = rootCall.processParameters(
    testSchema,
    parameters
  );
  return rootCall.call(testSchema, processedParameters.toObject());
}

describe('rootCalls', () => {
  describe('type', () => {
    it('Should throw for a non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('type'), Map({
          name: 'FooBar',
        }));
      }, /Type "FooBar" does not exist/);
    });
  });

  describe('nodes', () => {
    it('Should throw for a non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('nodes'), Map({
          type: 'FooBar',
        }));
      }, /Type "FooBar" does not exist/);
    });

  });

  describe('node', () => {
    it('Should throw for a non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('node'), Map({
          type: 'FooBar',
          id: '12345',
        }));
      }, /Type "FooBar" does not exist/);
    });
  });

  describe('addType', () => {
    it('Should not create duplicate type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addType'), Map({
          name: 'User',
        }));
      }, /Type "User" already exists/);
    });

    it('Should not create a type with built-in name', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addType'), Map({
          name: 'edges',
        }));
      }, /Type "edges" is a built-in non-node type/);
    });
  });

  describe('removeType', () => {
    it('Should not delete non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeType'), Map({
          name: 'FooBar',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not delete a built-in type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeType'), Map({
          name: 'edges',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('addField', () => {
    it('Should not add field to non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addField'), Map({
          type: 'FooBar',
          fieldName: 'foo',
          fieldType: 'string',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not add duplicate field', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addField'), Map({
          type: 'User',
          fieldName: 'handle',
          fieldType: 'string',
        }));
      }, /Type "User" already has a field "handle"/);
    });

    it('Should not add fields to a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addField'), Map({
          type: 'edges',
          fieldName: 'foo',
          fieldType: 'string',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('removeField', () => {
    it('Should not remove field from non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeField'), Map({
          type: 'FooBar',
          fieldName: 'foo',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not remove non-existant field', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeField'), Map({
          type: 'User',
          fieldName: 'unicornPowers',
        }));
      }, /Type "User" does not have a field "unicornPowers"/);
    });

    it('Should not remove field from a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeField'), Map({
          type: 'edges',
          fieldName: 'foo',
        }));
      }, /Type "edges" is not a node/);
    });

    it('Should not remove connection with removeField', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeField'), Map({
          type: 'Micropost',
          fieldName: 'author',
        }));
      }, /Field "author" of "Micropost" is a connection/);
    });
  });

  describe('addConnection', () => {
    it('Should not add connection to non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'FooBar',
          targetType: 'User',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "FooBar" does not exist/);

      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'User',
          targetType: 'FooBar',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not add duplicate connection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'Micropost',
          targetType: 'User',
          fieldName: 'author',
          targetFieldName: 'abargule',
        }));
      }, /Type "Micropost" already has a field "author"/);

      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'Micropost',
          targetType: 'User',
          fieldName: 'gurgle',
          targetFieldName: 'microposts',
        }));
      }, /Type "User" already has a field "microposts"/);
    });

    it('Should not add connections to built-ins', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'edges',
          targetType: 'User',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "edges" is not a node/);

      assert.throws(() => {
        processAndCall(rootCalls.get('addConnection'), Map({
          type: 'User',
          targetType: 'edges',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('removeConnection', () => {
    it('Should not remove connection from non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeConnection'), Map({
          type: 'FooBar',
          fieldName: 'foo',
        }));
      }, /Type "FooBar" does not exist/);

    });

    it('Should not remove non-existant connection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeConnection'), Map({
          type: 'User',
          fieldName: 'foo',
        }));
      }, /Type "User" does not have a field "foo"/);
    });

    it('Should not remove connection from a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeConnection'), Map({
          type: 'edges',
          fieldName: 'foo',
        }));
      }, /Type "edges" is not a node/);

    });

    it('Should not remove non-connection with removeConnection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('removeConnection'), Map({
          type: 'User',
          fieldName: 'handle',
        }));
      }, /Field "handle" of "User" is not a connection/);
    });
  });
});
