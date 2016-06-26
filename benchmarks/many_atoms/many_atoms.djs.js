'use strict';

const d = require('../../dist/derivable');

const atoms = [];

for (let i = 0; i < 1000; i++) {
  atoms.push(d.atom(i));
}

let sum = 0;

const $combined = d.derivation(() => {
  return atoms.reduce((total, a) => total + a.get(), 0);
});

$combined.react(n => {
  sum += n;
});

for (let n = 0; n < 5; n++) {
  for (let i = 0; i < 1000; i++) {
    const a = atoms[i];
    a.set(a.get() + 1);
  }
}

console.log("SUM", sum);
