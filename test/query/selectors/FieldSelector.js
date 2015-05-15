import assert from '../../assert';
import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import {getTerms, getNestedQueryArgument} from '../RethinkDBTestUtils';
import FieldSelector from '../../../query/selectors/FieldSelector';

describe('Field Selector', () => {
  const path = Immutable.List(['author', 'handle']);

  function makeQuery() {
    let selector = new FieldSelector({
      path: path,
    });

    return getTerms(
      RethinkDB.db('testdb').table('micropost').merge(
        selector.toReQL(RethinkDB.db('testdb'))
      )
    );
  }

  function makeClosureQuery() {
    let selector = new FieldSelector({
      path: path,
    });

    return getNestedQueryArgument(getTerms(
      RethinkDB.db('testdb').table('micropost').merge((obj) => {
        return selector.toReQL(RethinkDB.db('testdb'), {obj});
      })
    ), 0);
  }

  it('Should not use any table', () => {
    let result = makeQuery().first().args;

    assert.equal(result.find((part) => {
      return part.op === 'TABLE' || part.op === 'DB';
    }), undefined);
  });

  it('Should select via parent row list', () => {
    let result = makeQuery().first();

    assert.equal(result.args.first().args.last().op, 'IMPLICIT_VAR',
                 'Should use RethinkDB.row');

    let selectorChain = result.args.first().args
      .filter((arg) => arg.op === 'BRACKET')
      .map((arg) => arg.args.first());
    assert.oequal(path, selectorChain.reverse(),
                  'Should get correct path from parent');
  });

  it('Should select via argument in closure', () => {
    let result = makeClosureQuery();

    assert.equal(result.last().op, 'VAR',
                 'Should use closure variable');

    let selectorChain = result
          .filter((arg) => arg.op === 'BRACKET')
          .map((arg) => arg.args.first());
    assert.oequal(path, selectorChain.reverse(),
                  'Should get correct path from parent');

  });
});
