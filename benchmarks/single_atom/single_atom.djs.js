'use strict';

const atom = require('../../dist/derivable').atom;

const val = atom(0);

let sum = 0;

val.react(v => sum += v);

for (var i = 0; i < 1000000; i++) {
  val.set(i);
}

console.log("SUM", sum);
