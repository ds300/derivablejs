"use strict";
const expected = require("./_expected-output");
const assert = require("assert");

const S = require("s-js");

const f = function() {
  const root = S.value(0);

  let lastLevel = [root];

  for (let i = 0; i < 10; i++) {
    const nextLevel = [];
    lastLevel.forEach(d => {
      nextLevel.push(S(() => d() * 2 - 1), S(() => d() * 2));
    });
    lastLevel = nextLevel;
  }

  let sum = 0;

  lastLevel.map(d => {
    S(() => {
      sum += d();
    });
  });

  for (let i = 0; i < 100; i++) {
    root(root() + 1);
  }

  assert.strictEqual(sum, expected);
};

module.exports = function() {
  S.root(f);
};

if (require.main === module) {
  module.exports();
}
