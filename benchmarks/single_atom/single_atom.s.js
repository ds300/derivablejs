"use strict";
const expected = require("./_expected-output");
const assert = require("assert");

const S = require("s-js");

const f = function() {
  const val = S.value(0);

  let sum = 0;

  S(() => {
    sum += val();
  });

  for (let i = 0; i < 100000; i++) {
    val(i);
  }

  assert.strictEqual(sum, expected);
};

module.exports = function() {
  S.root(f);
};
