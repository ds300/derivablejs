'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const atom = require('../../dist/derivable').atom;

module.exports = function () {
  const val = atom(0);

  let sum = 0;

  val.react(v => sum += v);

  for (var i = 0; i < 100000; i++) {
    val.set(i);
  }

  assert.strictEqual(sum, expected);
};
