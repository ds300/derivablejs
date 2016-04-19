"use strict";
var atom_1 = require('../src-ts/atom');
var a = new atom_1.Atom(5);
console.log("a is 5:", a.get());
var twoa = a.derive(function (a) { return a * 2; });
console.log("twoa is 10:", twoa.get());
console.log("a is still 5:", a.get());
var r = twoa.reactor(function (a2) { return console.log("twoa is now: ", a2); });
var r2 = a.reactor(function (a) { return console.log("oh a is totally: ", a); });
r2.start();
r.start();
a.set(10);
setInterval(function () {
    if (Math.random() < 0.5) {
        a.set(Math.round(Math.random() * 500));
    }
}, 1000);
