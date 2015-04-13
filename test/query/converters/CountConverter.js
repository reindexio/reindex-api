import assert from '../../assert';
import r from 'rethinkdb';
import {getTerms} from '../rTestUtils';
import CountConverter from '../../../query/converters/CountConverter';

describe('CountConverter', () => {
  it('Should add count to query', () => {
    let converter = new CountConverter({});
    let query = r.db('testdb').table('micropost');

    let result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'COUNT');
  });
});
