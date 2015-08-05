/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
var havelock_1 = require('havelock');
var _ = require('havelock');
var immutable_1 = require('immutable');
var $ = require('immutable');
var numbers = havelock_1.atom(immutable_1.List([1, 2, 3]));
var doubled = numbers.derive(function (xs) {
    return xs.map(function (x) { return x * 2; }).toList();
});
function explode(xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    return size.derive(function (size) {
        return $.Range(0, size).map(function (i) { return xs.derive(function (xs) { return xs.get(i); }); }).toList();
    });
}
function map(f, xs) {
    var dxsI = explode(xs);
    var dxsO = dxsI.derive(function (dxs) {
        return dxs.map(function (dx) { return dx.derive(f); }).toList();
    });
    return dxsO.derive(function (dxs) { return dxs.map(_.get).toList(); });
}
var cachedDoubled = map(function (x) { console.log(x); return x * 2; }, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 10, 3]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
