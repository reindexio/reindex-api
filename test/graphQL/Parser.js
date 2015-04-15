import assert from '../assert';
import Immutable from 'immutable';
import {GQLRoot, GQLNode, GQLLeaf, GQLMethod} from '../../graphQL/AST';
import Parser from '../../graphQL/Parser';

describe('Parser', () => {
  it('Should be able to parse', () => {
    let query = `
      node(Micropost, f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        text,
        createdAt,
        author { handle }
    }`;
    let expected = new GQLRoot({
      name: 'node',
      parameters: Immutable.List([
        'Micropost',
        'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      ]),
      calls: Immutable.List(),
      children: Immutable.List([
        new GQLLeaf({ name: 'text'}),
        new GQLLeaf({ name: 'createdAt' }),
        new GQLNode({
          name: 'author',
          calls: Immutable.List(),
          children: Immutable.List([
            new GQLLeaf({ name: 'handle' }),
          ]),
        }),
      ]),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('Should be able to parse root calls', () => {
    let query = 'nodes(Micropost).after(5).first(10) { text }';
    let expected = new GQLRoot({
      name: 'nodes',
      parameters: Immutable.List([
        'Micropost',
      ]),
      calls: Immutable.List([
        new GQLMethod({
          name: 'after',
          parameters: Immutable.List.of('5'),
        }),
        new GQLMethod({
          name: 'first',
          parameters: Immutable.List.of('10'),
        }),
      ]),
      children: Immutable.List([
        new GQLLeaf({ name: 'text'}),
      ]),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('Should be able to parse calls in children', () => {
    let query = `node(Micropost, f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
       microposts.first(10) {
         count
       }
    }`;
    let expected = new GQLNode({
      name: 'microposts',
      calls: Immutable.List([
        new GQLMethod({
          name: 'first',
          parameters: Immutable.List.of('10'),
        }),
      ]),
      children: Immutable.List([
        new GQLLeaf({ name: 'count'}),
      ]),
    });

    assert.oequal(Parser.parse(query).children.first(), expected);
  });
});
