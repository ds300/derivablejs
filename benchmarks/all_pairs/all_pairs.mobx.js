'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const mobx = require('mobx');

module.exports = function () {

  const atoms = [];

  let sum = 0;

  for (let i = 0; i < 100; i++) {
    atoms.push(mobx.observable(i));
    var n = mobx.computed(() => {
      return atoms.reduce((total, a) => total + a.get(), 0);
    });
    ((n) => {
      mobx.autorun(() => {
        sum += n.get();
      });
    })(n);
  }

  for (let i = 0; i < 100; i++) {
    const a = atoms[i];
    a.set(a.get() + 1);
  }

  assert.strictEqual(sum, expected);
};

if (require.main === module) {
  module.exports();
}
