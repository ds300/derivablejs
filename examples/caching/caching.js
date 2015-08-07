/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
var havelock_1 = require('havelock');
var _ = require('havelock');
var immutable_1 = require('immutable');
var $ = require('immutable');
var mapping = function (f) { return function (xs) { return xs.map(f).toList(); }; };
var numbers = havelock_1.atom(immutable_1.List([1, 2, 3]));
var doubled = numbers.derive(mapping(function (x) { return x * 2; }));
var explode = function (xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    return size.derive(function (size) {
        return $.Range(0, size).map(function (i) { return xs.derive(function (xs) { return xs.get(i); }); }).toList();
    });
};
var map = function (f, xs) {
    var dxsI = explode(xs);
    var dxsO = dxsI.derive(mapping(function (dx) { return dx.derive(f); }));
    return dxsO.derive(mapping(_.unpack));
};
var logAndDouble = function (x) { console.log(x); return x * 2; };
var cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 10, 3]));
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
cachedDoubled = map(logAndDouble, numbers);
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
    return mapsplode(f, xs).derive(mapping(_.unpack));
};
numbers.set(immutable_1.List([1, 2, 3]));
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([0, 1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get());
var mapsplodeU = function (uf, f, xs) {
    var cache = immutable_1.Map();
    var ids = xs.derive(mapping(uf));
    var id2idx = ids.derive(function (ids) {
        var map = immutable_1.Map().asMutable();
        ids.forEach(function (id, idx) {
            map.set(id, idx);
        });
        return map.asImmutable();
    });
    function lookup(xs, id2idx, id) {
        return xs.get(id2idx.get(id));
    }
    return ids.derive(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        var result = [];
        ids.forEach(function (id) {
            if (newCache.has(id)) {
                throw new Error("duplicate id " + id);
            }
            var derivation = cache.get(id);
            if (derivation == null) {
                derivation = xs.derive(lookup, id2idx, id).derive(f);
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
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([0, 1, 2, 3]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([3, 2, 1, 0]));
console.log("cd:", cachedDoubled.get());
function deriveIDStuff(uf, xs) {
    var ids = xs.derive(mapping(uf));
    var id2idx = ids.derive(function (ids) {
        var map = immutable_1.Map().asMutable();
        ids.forEach(function (id, idx) {
            map.set(id, idx);
        });
        return map.asImmutable();
    });
    return { ids: ids, id2idx: id2idx };
}
function lookup(xs, id2idx, id) {
    return xs.get(id2idx.get(id));
}
mapsplodeU = function (uf, f, xs) {
    var cache = immutable_1.Map();
    var _a = deriveIDStuff(uf, xs), ids = _a.ids, id2idx = _a.id2idx;
    return ids.derive(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        var result = [];
        ids.forEach(function (id) {
            var derivation = newCache.get(id);
            if (derivation == null) {
                derivation = cache.get(id);
                if (derivation == null) {
                    derivation = xs.derive(lookup, id2idx, id).derive(f);
                }
                newCache.set(id, derivation);
            }
            result.push(derivation);
        });
        cache = newCache.asImmutable();
        return immutable_1.List(result);
    });
};
numbers.set(immutable_1.List([1, 2, 3]));
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 2]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([2, 2, 2, 2, 2, 2, 2]));
console.log("cd:", cachedDoubled.get());
cachedDoubled = mapsplodeU(function (x) { return x % 2; }, logAndDouble, numbers)
    .derive(mapping(_.unpack));
numbers.set(immutable_1.List([1, 2]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3]));
console.log("cd:", cachedDoubled.get());
numbers.set(immutable_1.List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
console.log("cd:", cachedDoubled.get());
var resplodeU = function (uf, r, xs) {
    var cache = immutable_1.Map();
    var _a = deriveIDStuff(uf, xs), ids = _a.ids, id2idx = _a.id2idx;
    ids.react(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        ids.forEach(function (id) {
            if (newCache.has(id)) {
                throw new Error("duplicate id '" + id + "'");
            }
            var reaction = cache.get(id);
            if (reaction == null) {
                reaction = xs.derive(lookup, id2idx, id).react(r);
            }
            else {
                cache = cache.remove(id);
            }
            newCache.set(id, reaction);
        });
        cache.valueSeq().forEach(function (r) { return r.stop(); });
        cache = newCache.asImmutable();
    });
    return null;
};
var things = havelock_1.atom($.fromJS([{ id: 0, name: "Zero" }, { id: 1, name: "One" }]));
var id = function (x) { return x.get('id'); };
var log = function (x) { return console.log("id: " + id(x) + ", name: " + x.get('name')); };
resplodeU(id, log, things);
things.swap(function (ts) { return ts.setIn([0, 'name'], "Wilbur"); });
resplodeU = function (uf, r, xs) {
    var cache = immutable_1.Map();
    var _a = deriveIDStuff(uf, xs), ids = _a.ids, id2idx = _a.id2idx;
    var reaction = ids.reaction(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        ids.forEach(function (id) {
            if (newCache.has(id)) {
                throw new Error("duplicate id '" + id + "'");
            }
            var reaction = cache.get(id);
            if (reaction == null) {
                reaction = xs.derive(lookup, id2idx, id).react(r);
            }
            else {
                cache = cache.remove(id);
            }
            newCache.set(id, reaction);
        });
        cache.valueSeq().forEach(function (r) { return r.stop(); });
        cache = newCache.asImmutable();
    });
    reaction.onStop = function () {
        cache.valueSeq().forEach(function (r) { return r.stop(); });
    };
    reaction.onStart = function () {
        ids.get().forEach(function (id) {
            var r;
            if ((r = cache.get(id))) {
                r.start();
            }
        });
    };
    return reaction;
};
var things2 = havelock_1.atom($.fromJS([{ id: 0, name: "Zero" }, { id: 1, name: "One" }]));
var reaction = resplodeU(id, log, things2).start().force();
things2.swap(function (ts) { return ts.setIn([1, 'name'], "Jefferson"); });
reaction.stop();
things2.swap(function (ts) { return ts.setIn([0, 'name'], "Thomas"); });
reaction.start();
things2.swap(function (ts) { return ts.setIn([1, 'name'], "The Tank Engine"); });
