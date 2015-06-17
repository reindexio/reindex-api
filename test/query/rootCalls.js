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

  describe('createType', () => {
    it('Should not create duplicate type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createType'), Map({
          name: 'User',
        }));
      }, /Type "User" already exists/);
    });

    it('Should not create a type with built-in name', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createType'), Map({
          name: 'edges',
        }));
      }, /Type "edges" is a built-in non-node type/);
    });
  });

  describe('deleteType', () => {
    it('Should not delete non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteType'), Map({
          name: 'FooBar',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not delete a built-in type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteType'), Map({
          name: 'edges',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('createField', () => {
    it('Should not create field to non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createField'), Map({
          type: 'FooBar',
          fieldName: 'foo',
          fieldType: 'string',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not create duplicate field', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createField'), Map({
          type: 'User',
          fieldName: 'handle',
          fieldType: 'string',
        }));
      }, /Type "User" already has a field "handle"/);
    });

    it('Should not create fields to a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createField'), Map({
          type: 'edges',
          fieldName: 'foo',
          fieldType: 'string',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('deleteField', () => {
    it('Should not delete field from non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteField'), Map({
          type: 'FooBar',
          fieldName: 'foo',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not delete non-existant field', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteField'), Map({
          type: 'User',
          fieldName: 'unicornPowers',
        }));
      }, /Type "User" does not have a field "unicornPowers"/);
    });

    it('Should not delete field from a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteField'), Map({
          type: 'edges',
          fieldName: 'foo',
        }));
      }, /Type "edges" is not a node/);
    });

    it('Should not delete connection with deleteField', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteField'), Map({
          type: 'Micropost',
          fieldName: 'author',
        }));
      }, /Field "author" of "Micropost" is a connection/);
    });
  });

  describe('createConnection', () => {
    it('Should not create connection to non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'FooBar',
          targetType: 'User',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "FooBar" does not exist/);

      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'User',
          targetType: 'FooBar',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not create duplicate connection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'Micropost',
          targetType: 'User',
          fieldName: 'author',
          targetFieldName: 'abargule',
        }));
      }, /Type "Micropost" already has a field "author"/);

      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'Micropost',
          targetType: 'User',
          fieldName: 'gurgle',
          targetFieldName: 'microposts',
        }));
      }, /Type "User" already has a field "microposts"/);
    });

    it('Should not create connections to built-ins', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'edges',
          targetType: 'User',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "edges" is not a node/);

      assert.throws(() => {
        processAndCall(rootCalls.get('createConnection'), Map({
          type: 'User',
          targetType: 'edges',
          fieldName: 'burgle',
          targetFieldName: 'abargule',
        }));
      }, /Type "edges" is not a node/);
    });
  });

  describe('deleteConnection', () => {
    it('Should not delete connection from non-existant type', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteConnection'), Map({
          type: 'FooBar',
          fieldName: 'foo',
        }));
      }, /Type "FooBar" does not exist/);

    });

    it('Should not delete non-existant connection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteConnection'), Map({
          type: 'User',
          fieldName: 'foo',
        }));
      }, /Type "User" does not have a field "foo"/);
    });

    it('Should not delete connection from a built-in', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteConnection'), Map({
          type: 'edges',
          fieldName: 'foo',
        }));
      }, /Type "edges" is not a node/);

    });

    it('Should not delete non-connection with deleteConnection', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('deleteConnection'), Map({
          type: 'User',
          fieldName: 'handle',
        }));
      }, /Field "handle" of "User" is not a connection/);
    });
  });

  describe('create', () => {
    it('Should not create to non existant types', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('create'), Map({
          type: 'FooBar',
          data: '{}',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not create to built-ins', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('create'), Map({
          type: 'edges',
          data: '{}',
        }));
      }, /Type "edges" is not a node/);
    });

    it('Should fail to create invalid data', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('create'), Map({
          type: 'Micropost',
          data: JSON.stringify({
            text: 'fooz',
            createdAt: 'NotADate',
            author: '1234',
          }),
        }));
      }, /Can not convert "NotADate" to datetime/);

      assert.throws(() => {
        processAndCall(rootCalls.get('create'), Map({
          type: 'Micropost',
          data: JSON.stringify({
            text: 'foo',
            createdAt: '2014-05-18T18:00:00Z',
            author: '1234',
            texta: 'fooz',
          }),
        }));
      }, /Type "Micropost" does not have a field "texta"/);

      assert.throws(() => {
        processAndCall(rootCalls.get('create'), Map({
          type: 'Micropost',
          data: JSON.stringify({
            text: 'foo',
            createdAt: '2014-05-18T18:00:00Z',
          }),
        }));
      }, /Type "Micropost" has missing required field/);
    });
  });

  describe('update', () => {
    it('Should not update non existant types', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('update'), Map({
          type: 'FooBar',
          id: '1234',
          data: '{}',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not update built-ins', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('update'), Map({
          type: 'edges',
          id: '1234',
          data: '{}',
        }));
      }, /Type "edges" is not a node/);
    });

    it('Should fail to update with invalid data', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('update'), Map({
          type: 'Micropost',
          id: '1234',
          data: JSON.stringify({
            text: 'fooz',
            createdAt: 'NotADate',
            author: '1234',
          }),
        }));
      }, /Can not convert "NotADate" to datetime/);

      assert.throws(() => {
        processAndCall(rootCalls.get('update'), Map({
          type: 'Micropost',
          id: '1234',
          data: JSON.stringify({
            text: 'foo',
            createdAt: '2014-05-18T18:00:00Z',
            author: '1234',
            texta: 'fooz',
          }),
        }));
      }, /Type "Micropost" does not have a field "texta"/);
    });

    it('Should allow updating  partial data', () => {
      assert.doesNotThrow(() => {
        processAndCall(rootCalls.get('update'), Map({
          type: 'Micropost',
          id: '1234',
          data: JSON.stringify({
            text: 'foo',
            createdAt: '2014-05-18T18:00:00Z',
          }),
        }));
      });
    });
  });

  describe('delete', () => {
    it('Should not delete in non-existent types', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('delete'), Map({
          type: 'FooBar',
          id: '1234',
        }));
      }, /Type "FooBar" does not exist/);
    });

    it('Should not delete built-ins', () => {
      assert.throws(() => {
        processAndCall(rootCalls.get('delete'), Map({
          type: 'edges',
          id: '1234',
        }));
      }, /Type "edges" is not a node/);
    });
  });
});
