import assert from '../assert';
import {List, Map} from 'immutable';
import {GQLRoot, GQLNode, GQLLeaf} from '../../graphQL/AST';
import Parser from '../../graphQL/Parser';

describe('Parser', () => {
  it('parses arbitrary query', () => {
    const query = `
      node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        text,
        createdAt,
        author { handle, }
    }`;
    const expected = new GQLRoot({
      name: 'node',
      parameters: Map({
        type: 'Micropost',
        id: 'f2f7fb49-3581-4caa-b84b-e9489eb47d84',
      }),
      children: List([
        new GQLLeaf({ name: 'text' }),
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

  it('parses root calls without parameters', () => {
    const query = 'schema() { types }';
    const expected = new GQLRoot({
      name: 'schema',
      parameters: Map(),
      children: List([
        new GQLLeaf({ name: 'types' }),
      ]),
    });

    assert.oequal(Parser.parse(query), expected);
  });

  it('parses root calls with parameters', () => {
    const query = 'nodes(type: Micropost, after: 5, first: 10) { text, }';
    const expected = new GQLRoot({
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

  it('parses calls in children', () => {
    const query = `
      node(type: Micropost, id: f2f7fb49-3581-4caa-b84b-e9489eb47d84) {
        microposts(first: 10) {
          count
        }
      }
    `;
    const expected = new GQLNode({
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

  it('parses aliases', () => {
    const query = `
      nodes(type: Micropost) as frobar {
        objects(first: 10) as foobar {
          nodes {
            text as textName,
            author as who {
              handle as nick
            }
          }
        }
      }
    `;
    const expected = List.of(new GQLNode({
      name: 'objects',
      alias: 'foobar',
      parameters: Map({
        first: '10',
      }),
      children: List([
        new GQLNode({
          name: 'nodes',
          children: List([
            new GQLLeaf({
              name: 'text',
              alias: 'textName',
            }),
            new GQLNode({
              name: 'author',
              alias: 'who',
              children: List([
                new GQLLeaf({
                  name: 'handle',
                  alias: 'nick',
                }),
              ]),
            }),
          ]),
        }),
      ]),
    }));
    const result = Parser.parse(query);

    assert.oequal(result.children, expected);
    assert.oequal(result.alias, 'frobar');
  });

  it('parses escapes', () => {
    const query = `
      insert(type: Micropost,
             data: \\{"data": "\\stuff\\\\f"\\},
             otherData: \\[1\\, 2\\, 3\\],
             thirdData: \\(randomStuffInsideBrackets\\)) {
        changes {
          count
        }
      }
    `;
    const expected = Map({
      type: 'Micropost',
      data: '{"data": "stuff\\f"}',
      otherData: '[1, 2, 3]',
      thirdData: '(randomStuffInsideBrackets)',
    });
    const result = Parser.parse(query).parameters;

    assert.oequal(result, expected);
  });

  it('fails when special characters are not escaped', () => {
    const queries = [
      `curlyBrackets(fail: {"data": "stuff"}) { test }`,
      `roundBrackets(fail: (erronneusStuff)) { test }`,
      `squareBrackets(fail: [1, 2, 3]) {test}`,
      `comma(fail: "some,StuffWithcomma", more: 123) { test }`,
    ];

    const parse = (query) => {
      return () => {
        Parser.parse(query);
      };
    };

    for (const query of queries) {
      assert.throws(parse(query));
    }
  });

  it('fails when empty block is passed', () => {
    assert.throws(() => {
      Parser.parse(`
        nodes() {
          foo {
          }
        }`
      );
    });
  });
});
