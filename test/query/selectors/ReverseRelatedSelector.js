import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms, getNestedQueryArgument} from '../rTestUtils';
import ReverseRelatedSelector from
  '../../../query/selectors/ReverseRelatedSelector';

describe('ReverseRelatedSelector', () => {
  function makeQuery(single) {
    let selector = new ReverseRelatedSelector({relatedField: 'author'});

    return getNestedQueryArgument(getTerms(
      r.db('testdb').table('user').merge((obj) => {
        return selector.toReQL(r, r.db('testdb'), {
          tableName: 'micropost',
          obj,
          single,
        });
      })
    ), 0);
  }

  it('Should use correct table', () => {
    let result = makeQuery().find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'micropost');
  });

  it('Should select both many and single object', () => {
    let result = makeQuery(false).first();
    assert.equal(result.op, 'GET_ALL', 'Should get many objects with getAll');

    result = makeQuery(true);
    assert.equal(result.get(1).op, 'GET_ALL',
                 'Should still get objects with getMany');
    assert.equal(result.first().op, 'NTH',
                 'Should get first object with NTH.');
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
