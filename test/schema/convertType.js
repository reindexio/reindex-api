import {fromJS} from 'immutable';
import convertType from '../../schema/convertType';
import assert from '../assert';

describe('convertType', () => {
  it('Should convert valid values', () => {
    assert.equal(convertType('number', '1'), 1);
    assert.equal(convertType('number', '1.0'), 1.0);
    assert.equal(convertType('integer', '1'), 1);
    assert.equal(convertType('string', 'someString'), 'someString');
    assert.equal(
      convertType('datetime', '2014-10-05').getTime(),
      new Date('2014-10-05').getTime()
    );
    assert.equal(
      convertType('datetime', '2014-10-05T18:00:00').getTime(),
      new Date('2014-10-05T18:00:00').getTime()
    );
    assert.equal(convertType('boolean', 'true'), true);
    assert.equal(convertType('boolean', 'false'), false);
    assert.oequal(convertType('object', '{"foo": [1, 2, 3]}'), fromJS({
      foo: [1, 2, 3],
    }));
    assert.oequal(convertType('array', '[1, 2, 3]'), fromJS([
      1, 2, 3,
    ]));
  });

  it('Should throw on parse failure', () => {
    assert.throws(() => {
      convertType('number', 'bogus');
    });
    assert.throws(() => {
      convertType('integer', 'bogus');
    });
    assert.throws(() => {
      convertType('integer', '1.0');
    });
    assert.throws(() => {
      convertType('datetime', 'bogusDate');
    });
    assert.throws(() => {
      convertType('boolean', 'truth');
    });
    assert.throws(() => {
      convertType('boolean', '0');
    });
    assert.throws(() => {
      convertType('object', 'unparseable');
    });
    assert.throws(() => {
      convertType('object', '[1, 2, 3]');
    });
    assert.throws(() => {
      convertType('array', '{"foo": "bar"}');
    });
    assert.throws(() => {
      convertType('array', 'unparesable');
    });
  });
});
