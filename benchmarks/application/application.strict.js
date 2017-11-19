"use strict";

const assert = require("assert");

const atom = require("../../dist/derivable").atom;

module.exports = function() {
  const add = (a, b) => a + b;
  const update = function(atom, fn, a, b, c, d) {
    switch (arguments.length) {
      case 2:
        return atom.set(fn(atom.get()));
      case 3:
        return atom.set(fn(atom.get(), a));
      case 4:
        return atom.set(fn(atom.get(), a, b));
      case 5:
        return atom.set(fn(atom.get(), a, b, c));
      case 6:
        return atom.set(fn(atom.get(), a, b, c, d));
      default:
        throw Error("update method accepts only 5 arguments");
    }
  };
  const val = atom(0);

  for (var i = 0; i < 10000; i++) {
    update(val, add, 1);
  }

  assert.strictEqual(val.get(), 10000);
};
