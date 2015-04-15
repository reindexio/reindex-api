import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms, getNestedQueryArgument} from '../RethinkDBTestUtils';
import RelatedSelector from '../../../query/selectors/RelatedSelector';

describe('RelatedSelector', () => {
  function makeQuery(single) {
    let selector = new RelatedSelector({relatedField: 'author'});

    return getTerms(selector.toReQL(
      r, r.db('testdb'), {tableName: 'micropost', single}
    ));
  }

  function makeClosureQuery() {
    let selector = new RelatedSelector({relatedField: 'author'});

    return getNestedQueryArgument(getTerms(
      r.db('testdb').table('micropost').merge((obj) => {
        return selector.toReQL(r, r.db('testdb'), {
          tableName: 'micropost',
          obj,
        });
      })
    ), 0);
  }

  it('Should use correct table', () => {
    let result = makeQuery().find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'micropost');
  });

  it('Should get both many and single object', () => {
    let result = makeQuery(false).first();
    assert.equal(result.op, 'GET_ALL', 'Should get many objects with getAll');

    result = makeQuery(true).first();
    assert.equal(result.op, 'GET', 'Should get single object with get');
  });

  it('Should select via parent row', () => {
    let result = makeQuery().first();

    assert.oequal(result.args.first().args, Immutable.List.of('author'),
                  'Should use correct field.');
    assert.equal(result.args.get(1).op, 'IMPLICIT_VAR',
                 'Should use r.row');
  });

  it('Should select via argument in closure', () => {
    let result = makeClosureQuery().first();

    assert.oequal(result.args.first().args, Immutable.List.of('author'),
                  'Should use correct field');
    assert.equal(result.args.get(1).op, 'VAR',
                 'Should use closure variable');
  });
});
