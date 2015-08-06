import {Kind} from 'graphql/language';

import assert from '../../assert';
import DateTime from '../../../graphQL/builtins/DateTime';

const dateISOString = '2015-08-06T10:03:50.052Z';

describe('DateTime', () => {
  it('coerces output dates', () => {
    const date = new Date(dateISOString);
    assert.equal(DateTime.coerce(date), date);
    assert.equal(DateTime.coerce(new Date('invalid')), null);
    assert.equal(DateTime.coerce(dateISOString), null);
    assert.equal(DateTime.coerce('some string'), null);
    assert.equal(DateTime.coerce(null), null);
    assert.equal(DateTime.coerce(undefined), null);
  });
  it('coerces input dates', () => {
    const ast = {
      kind: Kind.STRING,
      value: dateISOString,
    };
    assert.instanceOf(DateTime.coerceLiteral(ast), Date);
    assert.equal(
      DateTime.coerceLiteral(ast).getTime(),
      Date.parse(dateISOString)
    );
    assert.equal(DateTime.coerceLiteral({
      kind: Kind.STRING,
      value: '2015-13-13',
    }), null);
    assert.equal(DateTime.coerceLiteral({
      kind: Kind.STRING,
      value: 'mistake',
    }), null);
  });
});
