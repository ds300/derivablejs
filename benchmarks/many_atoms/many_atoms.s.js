"use strict";
const expected = require("./_expected-output");
const assert = require("assert");

const S = require("s-js");

const f = function() {
  const atoms = [];

  for (let i = 0; i < 1000; i++) {
    atoms.push(S.value(i));
  }

  let sum = 0;

  const $combined = S(() => {
    return atoms.reduce((total, a) => total + a(), 0);
  });

  S(() => {
    sum += $combined();
  });

  for (let i = 0; i < 1000; i++) {
    const a = atoms[i];
    a(a() + 1);
  }

  assert.strictEqual(sum, expected);
};

module.exports = function() {
  S.root(f);
};
