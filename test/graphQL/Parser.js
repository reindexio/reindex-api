import assert from '../assert';
import {List, Map} from 'immutable';
import {GQLRoot, GQLNode, GQLLeaf} from '../../graphQL/AST';
import Parser from '../../graphQL/Parser';

describe('Parser', () => {
  it('Should be able to parse', () => {
    let query = `
      node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        text,
        createdAt,
        author { handle }
    }`;
    let expected = new GQLRoot({
      name: 'node',
      parameters: Map({
        type: 'Micropost',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      }),
      children: List([
        new GQLLeaf({ name: 'text'}),
        new GQLLeaf({ name: 'createdAt' }),
        new GQLNode({
          name: 'author',
          calls: List(),
          children: List([
            new GQLLeaf({ name: 'handle' }),
          ]),
        }),
      ]),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('Should be able to parse root calls without parameters', () => {
    let query = 'schema() {}';
    let expected = new GQLRoot({
      name: 'schema',
      parameters: Map(),
      children: List(),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('Should be able to parse root calls with parameters', () => {
    let query = 'nodes(type: Micropost, after: 5, first: 10) { text }';
    let expected = new GQLRoot({
      name: 'nodes',
      parameters: Map({
        type: 'Micropost',
        after: '5',
        first: '10',
      }),
      children: List([
        new GQLLeaf({ name: 'text'}),
      ]),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('Should be able to parse calls in children', () => {
    let query = `
      node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        microposts(first: 10) {
          count
        }
      }
    `;
    let expected = new GQLNode({
      name: 'microposts',
      parameters: Map({
        first: '10',
      }),
      children: List([
        new GQLLeaf({ name: 'count'}),
      ]),
    });

    assert.oequal(Parser.parse(query).children.first(), expected);
  });
});
