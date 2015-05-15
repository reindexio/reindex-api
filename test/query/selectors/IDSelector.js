import assert from '../../assert';
import Immutable from 'immutable';
import RethinkDB from 'rethinkdb';
import {getTerms} from '../RethinkDBTestUtils';
import IDSelector from '../../../query/selectors/IDSelector';

describe('IDSelector', () => {
  const id = '1';

  function makeQuery() {
    let selector = new IDSelector({
      tableName: 'user',
      id: id,
    });

    return getTerms(selector.toReQL(
      RethinkDB.db('testdb'),
    ));
  }

  it('Should use correct table', () => {
    let result = makeQuery(false).find((part) => part.op === 'TABLE');
    assert.equal(result.args.first(), 'user');
  });

  it('Should use correct id', () => {
    let result = makeQuery().first();
    assert.equal(result.op, 'GET', 'Uses get to get object');
    assert.oequal(result.args, Immutable.List.of(id),
                  'Uses correct id');
  });
});
