import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms} from '../rTestUtils';
import SliceConverter from '../../../query/converters/SliceConverter';

describe('SliceConverter', () => {
  it('Should add slicing to query', () => {
    let query = r.db('testdb').table('micropost');

    let converter = new SliceConverter({
      from: 3
    });
    let result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'SLICE');
    assert.oequal(result.args, Immutable.List.of(3));

    converter = new SliceConverter({
      from: 3,
      to: 10
    });
    result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'SLICE');
    assert.oequal(result.args, Immutable.List([3, 10]));
  });
});
