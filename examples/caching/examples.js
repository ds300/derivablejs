/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
/***

# Caching Derivations

***/
var havelock_1 = require('havelock');
var _ = require('havelock');
var immutable_1 = require('immutable');
var $ = require('immutable');
var numbers = havelock_1.atom(immutable_1.List([1, 2, 3]));
var doubled = numbers.derive(function (xs) {
    return xs.map(function (x) { return x * 2; }).toList();
});
var explode = function (xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    return size.derive(function (size) {
        return $.Range(0, size).map(function (i) { return xs.derive(function (xs) { return xs.get(i); }); }).toList();
    });
};
var map = function (f, xs) {
    var dxsI = explode(xs);
    var dxsO = dxsI.derive(function (dxs) {
        return dxs.map(function (dx) { return dx.derive(f); }).toList();
    });
    return dxsO.derive(function (dxs) { return dxs.map(_.get).toList(); });
};
var cachedDoubled = map(function (x) { console.log(x); return x * 2; }, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 10, 3]));
console.log("cd:", cachedDoubled.get());
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
explode = function (xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    var cache = immutable_1.List();
    return size.derive(function (size) {
        if (size > cache.size) {
            cache = cache.concat($.Range(cache.size, size).map(function (i) {
                return xs.derive(function (xs) { return xs.get(i); });
            })).toList();
        }
        else {
            cache = cache.setSize(size);
        }
        return cache;
    });
};
numbers.set(immutable_1.List([1, 2, 3]));
cachedDoubled = map(function (x) { console.log(x); return x * 2; }, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
var mapsplode = function (f, xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    var cache = immutable_1.List();
    return size.derive(function (size) {
        if (size > cache.size) {
            cache = cache.concat($.Range(cache.size, size).map(function (i) {
                return xs.derive(function (xs) { return xs.get(i); }).derive(f);
            })).toList();
        }
        else {
            cache = cache.setSize(size);
        }
        return cache;
    });
};
map = function (f, xs) {
    return mapsplode(f, xs).derive(function (dxs) { return dxs.map(_.get).toList(); });
};
numbers.set(immutable_1.List([1, 2, 3]));
cachedDoubled = map(function (x) { console.log(x); return x * 2; }, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([0, 1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
var mapsplodeU = function (uf, f, xs) {
    var cache = immutable_1.Map();
    var ids = xs.derive(function (xs) { return xs.map(uf).toList(); });
    var id2idx = ids.derive(function (ids) {
        var map = immutable_1.Map().asMutable();
        ids.forEach(function (id, idx) {
            map.set(id, idx);
        });
        return map.asMutable();
    });
    return ids.derive(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        var result = [];
        ids.forEach(function (id) {
            if (newCache.has(id)) {
                throw new Error("duplicate id " + id);
            }
            var derivation = cache.get(id);
            if (derivation == null) {
                derivation = xs.derive(function (xs) { return xs.get(id2idx.get().get(id)); }).derive(f);
            }
            newCache.set(id, derivation);
            result.push(derivation);
        });
        cache = newCache.asImmutable();
        return immutable_1.List(result);
    });
};
mapsplode = function (f, xs) { return mapsplodeU(function (x) { return x; }, f, xs); };
numbers.set(immutable_1.List([1, 2, 3]));
cachedDoubled = map(function (x) { console.log(x); return x * 2; }, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([0, 1, 2, 3]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([3, 2, 1, 0]));
console.log("cd:", cachedDoubled.get());
