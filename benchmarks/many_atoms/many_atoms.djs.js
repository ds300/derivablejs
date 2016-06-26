'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const djs = require('../../dist/derivable');

module.exports = function () {

  const atoms = [];

  for (let i = 0; i < 1000; i++) {
    atoms.push(djs.atom(i));
  }

  let sum = 0;

  const $combined = djs.derivation(() => {
    return atoms.reduce((total, a) => total + a.get(), 0);
  });

  $combined.react(n => {
    sum += n;
  });

  for (let i = 0; i < 1000; i++) {
    const a = atoms[i];
    a.set(a.get() + 1);
  }

  assert.strictEqual(sum, expected);
};
