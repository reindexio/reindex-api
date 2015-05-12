/* eslint "no-underscore-dangle": 0 */

import {is} from 'immutable';
import chai from 'chai';

function oequal(result) {
  this.assert(
    is(this._obj, result),
    'expected #{act} to be the same as #{exp}',
    'expected #{act} not to be the same as #{exp}',
    result.toString(),
    this._obj.toString()
  );
}

chai.Assertion.addMethod('oequal', oequal);

let assert = chai.assert;

assert.oequal = function(act, exp, msg) {
  return new chai.Assertion(act, msg).to.be.oequal(exp);
};

export default assert;
