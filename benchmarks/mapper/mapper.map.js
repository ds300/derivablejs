'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const atom = require('../../dist/derivable').atom;

module.exports = function () {
  const val = atom(0);

  let sumMap = 0;
  let sumMaybe = 0;

  let lastMap = val;
  let lastMaybe = val;

  for (var i = 0; i < 1000; i++) {
    lastMap = lastMap.map(x => x + 1);
    lastMap.react(d => {
      sumMap += d;
    });
    lastMaybe = lastMaybe.mMap(x => x + 1);
    lastMaybe.react(d => {
      sumMaybe += d;
    });
  }

  for (var i = 0; i < 100; i++) {
    val.set(i);
  }

  assert.strictEqual(sumMap, expected);
  assert.strictEqual(sumMaybe, expected);
};
