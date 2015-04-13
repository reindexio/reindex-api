import chai from 'chai';
import oequal from 'chai-oequal';

chai.use(oequal);

let assert = chai.assert;

assert.oequal = function (act, exp, msg) {
  return new chai.Assertion(act, msg).to.be.oequal(exp);
};

export default assert;
