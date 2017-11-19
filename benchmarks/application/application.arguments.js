"use strict";

const assert = require("assert");

const atom = require("../../dist/derivable").atom;

module.exports = function() {
  const add = (a, b) => a + b;
  const update = function(atom, fn) {
    var args = [],
      len = arguments.length - 2;
    while (len-- > 0) args[len] = arguments[len + 2];
    return atom.set(fn.apply(void 0, [atom.get()].concat(args)));
  };
  const val = atom(0);

  for (var i = 0; i < 10000; i++) {
    update(val, add, 1);
  }

  assert.strictEqual(val.get(), 10000);
};
