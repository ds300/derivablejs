'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const mobx = require('mobx');

module.exports = function () {
  const val = mobx.observable(0);

  let sum = 0;

  mobx.autorun(() => {
    sum += val.get();
  });

  for (var i = 0; i < 100000; i++) {
    val.set(i);
  }

  assert.strictEqual(sum, expected);
};
