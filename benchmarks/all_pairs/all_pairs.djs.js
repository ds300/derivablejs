'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const djs = require('../../dist/derivable');

module.exports = function () {

  const atoms = [];

  let sum = 0;

  for (let i = 0; i < 100; i++) {
    atoms.push(djs.atom(i));
    djs.derive(() => {
      return atoms.reduce((total, a) => total + a.get(), 0);
    }).react(n => {
      sum += n;
    });
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
