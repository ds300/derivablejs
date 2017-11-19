"use strict";

const assert = require("assert");

const atom = require("../../dist/derivable").atom;

module.exports = function() {
  const add = (a, b) => a + b;
  const update = (atom, fn) => atom.set(fn(atom.get()));
  const val = atom(0);

  for (var i = 0; i < 10000; i++) {
    update(val, add.bind(null, 1));
  }

  assert.strictEqual(val.get(), 10000);
};
