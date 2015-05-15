import assert from '../../assert';
import RethinkDB from 'rethinkdb';
import {getTerms} from '../RethinkDBTestUtils';
import AllSelector from '../../../query/selectors/AllSelector';

describe('AllSelector', () => {
  function makeQuery() {
    let selector = new AllSelector({
      tableName: 'user',
    });

    return getTerms(selector.toReQL(RethinkDB.db('testdb')));
  }

  it('Should use correct table', () => {
    let result = makeQuery().find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'user');
  });
});
