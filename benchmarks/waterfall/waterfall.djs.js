'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const atom = require('../../dist/derivable').atom;

module.exports = function () {
  const val = atom(0);

  let sum = 0;

  let lastDerivation = val;

  for (let i = 0; i < 1000; i++) {
    lastDerivation = lastDerivation.derive(x => x + 1);
    lastDerivation.react(v => {
      sum += v;
    });
  }

  for (var i = 0; i < 100; i++) {
    val.set(i);
  }

  assert.strictEqual(sum, expected);
};
