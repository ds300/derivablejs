'use strict';

const atom = require('../../dist/derivable').atom;

const val = atom(0);

let sum = 0;

let lastDerivation = val;

for (let i = 0; i < 1000; i++) {
  lastDerivation = lastDerivation.derive(x => x + 1);
  lastDerivation.react(v => {
    sum += v;
  });
}

for (var i = 0; i < 1000; i++) {
  val.set(i);
}

console.log("SUM", sum);
