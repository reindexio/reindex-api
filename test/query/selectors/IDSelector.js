import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms} from '../RethinkDBTestUtils';
import IDSelector from '../../../query/selectors/IDSelector';

describe('IDSelector', () => {
  const ids = Immutable.List([1, 2, 3]);

  function makeQuery(single) {
    let selector = new IDSelector({ids: ids});

    return getTerms(selector.toReQL(
      r, r.db('testdb'), {tableName: 'user', single}
    ));
  }

  it('Should use correct table', () => {
    let result = makeQuery(false).find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'user');
  });

  it('Should get both many and single object', () => {
    let result = makeQuery(true).first();
    assert.equal(result.op, 'GET', 'Uses get to get single object');
    assert.oequal(result.args, Immutable.List.of(1),
                  'Passes only one id');

    result = makeQuery(false).first();
    assert.equal(result.op, 'GET_ALL', 'Uses get to getAll to get many.');
    assert.oequal(result.args, ids, 'Passes all ids.');
  });
});
