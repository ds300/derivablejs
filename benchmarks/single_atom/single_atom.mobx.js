'use strict';

const mobx = require('mobx');

const val = mobx.observable(0);

let sum = 0;

mobx.autorun(() => {
  sum += val.get();
});

for (var i = 0; i < 1000000; i++) {
  val.set(i);
}

console.log("SUM", sum);
