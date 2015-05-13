import {List} from 'immutable';
import graphQLToQuery from '../../query/graphQLToQuery';
import {GQLRoot, GQLNode, GQLLeaf} from '../../graphQL/AST';
import testSchema from '../testSchema';
import assert from '../assert';

describe('graphQLToQuery', () => {
  it('Should convert valid AST to query', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'edges',
          children: List([
            new GQLLeaf({
              name: 'createdAt',
            }),
          ]),
        }),
      ]),
    });

    // TODO: proper tests
    assert.doesNotThrow(() => {
      graphQLToQuery(testSchema, root);
    });
  });
});

describe('Type Checking', () => {
  it('Should fail on non-existant root call', () => {
    let root = new GQLRoot({
      name: 'nodez',
      parameters: List(),
      calls: List(),
      children: List(),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Root call "nodez" is invalid./);
  });

  it('Should fail on invalid method', () => {
    // Intentionally left blank, as methods are not going to be in graphql.
  });

  it('Should fail on non-existant scalar field', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'edges',
          children: List([
            new GQLLeaf({
              name: 'createdat',
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Scalar field "Micropost.createdat" does not exist/);
  });

  it('Should fail on non-existant nested field', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'edges',
          children: List([
            new GQLNode({
              name: 'auhtor',
              children: List([
                new GQLLeaf({
                  name: 'handle',
                }),
              ]),
            }),
          ]),
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /Nested field "Micropost.auhtor" does not exist/);
  });

  it('Should fail when scalar and nested fields are mixed up', () => {
    let root = new GQLRoot({
      name: 'nodes',
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'edges',
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
        }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /"Micropost.createdAt" is scalar, but was passed fields/);

    root = new GQLRoot({
      name: 'nodes',
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLNode({
          name: 'edges',
          children: List([
            new GQLLeaf({
              name: 'author',
            }),
          ]),
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
      parameters: List(['Micropost']),
      calls: List(),
      children: List([
        new GQLLeaf({
          name: 'createdAt',
          }),
      ]),
    });

    assert.throws(() => {
      graphQLToQuery(testSchema, root);
    }, /"createdAt" is an invalid field for a connection. /);
  });
});
