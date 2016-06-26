'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const mobx = require('mobx');

module.exports = function () {
  const val = mobx.observable(0);

  let sum = 0;

  let lastDerivation = val;

  for (let i = 0; i < 1000; i++) {
    lastDerivation = (d => mobx.computed(() => d.get() + 1))(lastDerivation);
    (d => mobx.autorun(() => {
      sum += d.get();
    }))(lastDerivation);
  }

  for (var i = 0; i < 100; i++) {
    val.set(i);
  }

  assert.strictEqual(sum, expected);
};
