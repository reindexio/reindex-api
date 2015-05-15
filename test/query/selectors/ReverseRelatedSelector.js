import assert from '../../assert';
import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import {getTerms, getNestedQueryArgument} from '../RethinkDBTestUtils';
import ReverseRelatedSelector from
  '../../../query/selectors/ReverseRelatedSelector';

describe('ReverseRelatedSelector', () => {
  function makeQuery() {
    let selector = new ReverseRelatedSelector({
      tableName: 'micropost',
      relatedField: 'author',
    });

    return getNestedQueryArgument(getTerms(
      RethinkDB.db('testdb').table('user').merge((obj) => {
        return selector.toReQL(RethinkDB.db('testdb'), {obj});
      })
    ), 0);
  }

  it('Should use correct table', () => {
    let result = makeQuery().find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'micropost');
  });

  it('Should select both many objects', () => {
    let result = makeQuery().first();
    assert.equal(result.op, 'GET_ALL', 'Should get many objects with getAll');
  });

  it('Should select via argument in closure using id and index', () => {
    let result = makeQuery().first();

    assert.oequal(result.args.first().args, Immutable.List.of('id'),
                  'Should query by id.');
    assert.equal(result.args.get(1).op, 'VAR',
                 'Should use closure variable.');
    assert.oequal(result.optArgs, Immutable.Map({
      index: 'author',
    }), 'Should use index.');
  });
});
