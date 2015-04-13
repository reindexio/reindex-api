import assert from '../../assert';
import Immutable from 'immutable';
import r from 'rethinkdb';
import {getTerms} from '../rTestUtils';
import OrderByConverter from '../../../query/converters/OrderByConverter';

describe('OrderByConverter', () => {
  it('Should add orderBy to query', () => {
    let query = r.db('testdb').table('micropost');

    let converter = new OrderByConverter({
      orderBy: 'createdAt',
    });
    let result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'ORDER_BY',
                 'Should use ORDER_BY for ascending.');
    assert.equal(result.args.first().op, 'ASC',
                 'Should use ASC for ascending.');
    assert.equal(result.args.first().args.first(), 'createdAt',
                 'Should have correct field in ascending.');

    converter = new OrderByConverter({
      orderBy: '-createdAt',
    });
    result = getTerms(
      converter.toReQL(r, r.db('testdb'), query)
    ).first();
    assert.equal(result.op, 'ORDER_BY',
                 'Should use ORDER_BY for descending.');
    assert.equal(result.args.first().op, 'DESC',
                 'Should use DESC for descending.');
    assert.equal(result.args.first().args.first(), 'createdAt',
                 'Should have correct field in descending.');
  });
});
