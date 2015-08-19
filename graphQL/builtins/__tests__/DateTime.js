import {Kind} from 'graphql/language';

import assert from '../../../test/assert';
import DateTime from '../DateTime';

const dateISOString = '2015-08-06T10:03:50.052Z';

describe('DateTime', () => {
  it('serializes javascript dates', () => {
    const date = new Date(dateISOString);
    assert.equal(DateTime.serialize(date), date.toISOString());
    assert.equal(DateTime.serialize(new Date('invalid')), null);
    assert.equal(DateTime.serialize(dateISOString), null);
    assert.equal(DateTime.serialize('some string'), null);
    assert.equal(DateTime.serialize(null), null);
    assert.equal(DateTime.serialize(undefined), null);
  });

  it('parses literal dates', () => {
    const ast = {
      kind: Kind.STRING,
      value: dateISOString,
    };
    assert.instanceOf(DateTime.parseLiteral(ast), Date);
    assert.equal(
      DateTime.parseLiteral(ast).getTime(),
      Date.parse(dateISOString)
    );
    assert.equal(DateTime.parseLiteral({
      kind: Kind.STRING,
      value: '2015-13-13',
    }), null);
    assert.equal(DateTime.parseLiteral({
      kind: Kind.STRING,
      value: 'mistake',
    }), null);
  });
});
