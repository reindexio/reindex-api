import {List, Map} from 'immutable';
import graphQLToQuery from '../../query/graphQLToQuery';
import {GQLRoot, GQLNode, GQLLeaf} from '../../graphQL/AST';
import testSchema from '../testSchema';
import assert from '../assert';

describe('graphQLToQuery', () => {
  it('Should convert valid AST to query', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map({type: 'Micropost'}),
      children: List([
        new GQLNode({
          name: 'objects',
          parameters: Map({
            first: '5',
          }),
          children: List([
            new GQLNode({
              name: 'nodes',
              children: List([
                new GQLLeaf({
                  name: 'createdAt',
                }),
              ]),
            }),
          ]),
        }),
      ]),
    });

    graphQLToQuery(testSchema, root);

    // TODO: proper tests
    assert.doesNotThrow(() => {
      graphQLToQuery(testSchema, root);
    });
  });
});

describe('Type Checking', () => {
  it('Should fail on non-existant root call', () => {
    let root = new GQLRoot({
      name: 'bogus',
      parameters: Map(),
      children: List(),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Root call "bogus" is invalid./);
  });

  it('Should fail on invalid parameters', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map({
        type: 'Micropost',
        id: 'oueou',
      }),
      children: List(),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Call "nodes" has no parameter "id"/);
  });

  it('Should fail on missing parameters', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map(),
      children: List(),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Call "nodes" wasn\'t passed required parameter\(s\) type/);

  });

  it('Should fail on non-existant scalar field', () => {
    let root = new GQLRoot({
      name: 'node',
      parameters: Map({type: 'Micropost', id: 'uaeoou'}),
      children: List([
        new GQLLeaf({
          name: 'bogusField',
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Scalar field "Micropost.bogusField" does not exist/);
  });

  it('Should fail on non-existant nested field', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map({type: 'Micropost'}),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'objects',
          children: List([
            new GQLNode({
              name: 'nodes',
              children: List([
                new GQLNode({
                  name: 'writer',
                  children: List([
                    new GQLLeaf({
                      name: 'handle',
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Nested field "Micropost.writer" does not exist/);
  });

  it('Should fail when scalar and nested fields are mixed up', () => {
    let root = new GQLRoot({
      name: 'node',
      parameters: Map({type: 'Micropost', id: 'ueou'}),
      children: List([
        new GQLNode({
          name: 'createdAt',
          children: List([
            new GQLLeaf({
              name: 'handle',
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /"Micropost.createdAt" is scalar, but was passed fields/);

    root = new GQLRoot({
      name: 'node',
      parameters: Map({type: 'Micropost', id: 'uoeue'}),
      children: List([
        new GQLLeaf({
          name: 'author',
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /"Micropost.author" is nested, but was not passed fields/);
  });

  it('Should fail if invalid fields are passed to edgeables.', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map({type: 'Micropost'}),
      children: List([
        new GQLNode({
          name: 'objects',
          children: List([
            new GQLLeaf({
              name: 'createdAt',
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /"createdAt" is an invalid field for a connection. /);

    root = new GQLRoot({
      name: 'nodes',
      parameters: Map({type: 'Micropost'}),
      children: List([
        new GQLLeaf({
          name: 'createdAt',
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Nested field "nodesResult.createdAt" does not exist/);
  });

  it('Should fail on invalid parameter types', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: Map({type: 'Micropost'}),
      children: List([
        new GQLNode({
          name: 'objects',
          parameters: Map({
            first: '5.0',
          }),
          children: List([
            new GQLNode({
              name: 'nodes',
              children: List([
                new GQLLeaf({
                  name: 'createdAt',
                }),
              ]),
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Can not convert "5\.0" to integer/);
  });
});
