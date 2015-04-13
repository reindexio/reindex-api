import assert from '../assert';
import Immutable from 'immutable';
import {GQLRoot, GQLNode, GQLLeaf, GQLCall} from '../../graphQL/AST';
import Parser from '../../graphQL/Parser';

describe('Parser', () => {
  it('Should be able to parse', () => {
    let query = 'Micropost(f2f7fb49-3581-4caa-b84b-e9489eb47d84) { text, createdAt, author { handle }}';
    let expected = new GQLNode({
      name: 'Micropost',
      calls: Immutable.List([
        new GQLCall({
          name: '__call__',
          parameters: Immutable.List([
            'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
          ]),
        }),
      ]),
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

    assert.oequal(Parser.parse(query).node, expected);
  });

  it('Should be able to parse root chains', () => {
    let query = 'Micropost.first(10) { text }';
    let expected = new GQLNode({
      name: 'Micropost',
      calls: Immutable.List([
        new GQLCall({
          name: 'first',
          parameters: Immutable.List.of('10'),
        }),
      ]),
      children: Immutable.List([
        new GQLLeaf({ name: 'text'}),
      ]),
    });

    assert.oequal(Parser.parse(query).node, expected);
  });

  it('Should be able to parse calls in children', () => {
    let query = 'Author(f2f7fb49-3581-4caa-b84b-e9489eb47d84) { microposts.first(10) { count }}';
    let expected = new GQLNode({
      name: 'microposts',
      calls: Immutable.List([
        new GQLCall({
          name: 'first',
          parameters: Immutable.List.of('10'),
        }),
      ]),
      children: Immutable.List([
        new GQLLeaf({ name: 'count'}),
      ]),
    });

    assert.oequal(Parser.parse(query).node.children.first(), expected);
  });
});
