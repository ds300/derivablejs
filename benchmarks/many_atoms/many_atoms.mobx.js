'use strict';

const mobx = require('mobx');

const atoms = [];

for (let i = 0; i < 1000; i++) {
  atoms.push(mobx.observable(i));
}

let sum = 0;

const $combined = mobx.computed(() => {
  return atoms.reduce((total, a) => total + a.get(), 0);
});

mobx.autorun(() => {
  sum += $combined.get();
});

for (let n = 0; n < 5; n++) {
  for (let i = 0; i < 1000; i++) {
    const a = atoms[i];
    a.set(a.get() + 1);
  }
}

console.log("SUM", sum);
