"use strict";
const expected = require("./_expected-output");
const assert = require("assert");

const S = require("s-js");

const f = function() {
  const atoms = [];

  let sum = 0;

  for (let i = 0; i < 100; i++) {
    atoms.push(S.value(i));
    const n = S(() => {
      return atoms.reduce((total, a) => total + a(), 0);
    });
    S(() => (sum += n()));
  }

  for (let i = 0; i < 100; i++) {
    const a = atoms[i];
    a(a() + 1);
  }

  assert.strictEqual(sum, expected);
};

module.exports = function() {
  S.root(f);
};

if (require.main === module) {
  module.exports();
}
