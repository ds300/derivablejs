"use strict";

const assert = require("assert");

const atom = require("../../dist/derivable").atom;

module.exports = function() {
  const add = (a, b) => a + b;
  const update = (atom, fn, ...args) => atom.set(fn(atom.get(), ...args));
  const val = atom(0);

  for (var i = 0; i < 10000; i++) {
    update(val, add, 1);
  }

  assert.strictEqual(val.get(), 10000);
};
