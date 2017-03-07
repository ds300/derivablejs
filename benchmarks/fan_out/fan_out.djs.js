'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const djs = require('../../dist/derivable');

module.exports = function () {

  const root = djs.atom(0);

  let lastLevel = [root];

  for (let i = 0; i < 10; i++) {
    const nextLevel = [];
    lastLevel.forEach(d => {
      nextLevel.push(d.derive(x => x * 2 - 1), d.derive(x => x * 2));
    });
    lastLevel = nextLevel;
  }

  let sum = 0;

  lastLevel.map(d => d.react(n => {
    sum += n;
  }));

  for (let i = 0; i < 100; i++) {
    root.set(root.get() + 1);
  }

  assert.strictEqual(sum, expected);
};

if (require.main === module) {
  module.exports();
}
