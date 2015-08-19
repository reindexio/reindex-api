/* eslint "no-underscore-dangle": 0 */

import { is } from 'immutable';
import chai from 'chai';
import { diffJson } from 'diff';

function oequal(result) {
  const diff = diffJson(
    JSON.stringify(result, null, 2),
    JSON.stringify(this._obj, null, 2)
  );
  this.assert(
    is(this._obj, result),
    diffToString('expected #{act} to be the same as #{exp}', diff),
    diffToString('expected #{act} not to be the same as #{exp}', diff),
    result.toString(),
    this._obj.toString()
  );
}

function diffToString(header, diff) {
  return [header].concat(['\n']).concat(
    diff.map(function(part) {
      let prefix;
      if (part.added) {
        prefix = '+';
      } else if (part.removed) {
        prefix = '-';
      } else {
        prefix = '>';
      }
      let line = part.value;
      // Remove one whitespace if possible, to make align nicely.
      if (line[0] === ' ') {
        line = line.slice(1);
      }
      return prefix + line;
    })
  ).join('');
}

chai.Assertion.addMethod('oequal', oequal);

const assert = chai.assert;

assert.oequal = function(act, exp, msg) {
  return new chai.Assertion(act, msg).to.be.oequal(exp);
};

assert.equal = assert.strictEqual;
assert.notEqual = assert.notStrictEqual;

export default assert;
