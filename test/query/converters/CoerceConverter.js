import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms} from '../rTestUtils';
import CoerceConverter from '../../../query/converters/CoerceConverter';

describe('CoerceConverter', () => {
  it('Should add coerceTo to query', () => {
    let converter = new CoerceConverter({
      to: 'array'
    });
    let query = r.db('testdb').table('micropost');

    let result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'COERCE_TO');
    assert.equal(result.args.first(), 'array');
  });
});
