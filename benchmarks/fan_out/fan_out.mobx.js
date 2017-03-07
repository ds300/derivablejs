'use strict';
const expected = require('./_expected-output');
const assert = require('assert');

const mobx = require('mobx');

module.exports = function () {

  const root = mobx.observable(0);

  let lastLevel = [root];

  for (let i = 0; i < 10; i++) {
    const nextLevel = [];
    lastLevel.forEach(d => {
      nextLevel.push(
        mobx.computed(() => d.get() * 2 - 1),
        mobx.computed(() => d.get() * 2)
      );
    });
    lastLevel = nextLevel;
  }

  let sum = 0;

  lastLevel.map(d => {
    mobx.autorun(() => {
      sum += d.get();
    });
  });

  for (let i = 0; i < 100; i++) {
    root.set(root.get() + 1);
  }

  assert.strictEqual(sum, expected);
};

if (require.main === module) {
  module.exports();
}
