/// <reference path="./node_modules/derivable/dist/derivable.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
/***

# Caching Derivations

#### Probelms

You've got a derivable list of values, and you want to map some function over
them to create a new derivable list of values. Here's the obvious way to do it:

***/
var derivable_1 = require('derivable');
var _ = require('derivable');
var immutable_1 = require('immutable');
var $ = require('immutable');
// helper function for mapping over immutable lists eagerly
var mapping = function (f) { return function (xs) { return xs.map(f).toList(); }; };
var numbers = derivable_1.atom(immutable_1.List([1, 2, 3]));
var doubled = numbers.derive(mapping(function (x) { return x * 2; }));
/***

The problem with this is that each time `numbers` changes, every item in it is reprocessed. This isn't so bad when all you're doing is doubling an integer, but it would be nice to have a way to avoid doing the mapping for values that don't change. This could be very beneficial if the cost of the mapping dwarfs the overhead involved in figuring out which items have changed etc.

Another related problem situation is if you have a list whose contents might change in any way, but you want to react to changes in list items individually. There's no obvious way to do that with Derivables straight out of the box.

Let's call the first problem 'the mapping problem' and the second 'the reacting problem' for brevity's sake.

#### Solving the Mapping Problem

The solution starts out by taking the derivable list of values and converting it into a derivable list of derivable values.

That might look like this (forgive the weird declaration, we'll need to rebind it later):

***/
var explode = function (xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    return size.derive(function (size) {
        return $.Range(0, size).map(function (i) { return xs.derive(function (xs) { return xs.get(i); }); }).toList();
    });
};
/***

*Also, please don't freak out about the nested derivableness. It's fine. Honest.*

So for every index in `xs`, we create a new derivable which simply looks up that index. Now we can partially solve the mapping problem

***/
var map = function (f, xs) {
    // first get the list of derivables
    var dxsI = explode(xs);
    // now map f over the derivables
    var dxsO = dxsI.derive(mapping(function (dx) { return dx.derive(f); }));
    // so at this point the Derivable<O>s only get recalculated when the
    // Derivable<I>s change. And, if you'll remember, the Derivable<I>s
    // get recalculated whenever xs changes, but they might not have changed.
    // and finally unpack
    return dxsO.derive(mapping(_.unpack));
    // so the result List<O> gets rebuilt whenever any one of the Derivable<O>s
    // changes. This is as good as it gets with immutable collections.
};
var logAndDouble = function (x) { console.log(x); return x * 2; };
var cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]
numbers.set(immutable_1.List([1, 10, 3]));
console.log("cd:", cachedDoubled.get()); //$
// $> 10
// $> cd: List [ 2, 20, 6 ]
/***

Notice that only the number 10 was reprocessed.
The reason this is only a partial solution is that if `xs` changes in length, all the derivations get regenerated which means all the values get recomputed.

***/
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get()); //$
// $> 2
// $> 1
// $> 2
// $> 3
// $> 4
// $> cd: List [ 2, 4, 6, 8 ]
/***

So how to avoid this? Caching! If `explode` caches the `Derivable<T>`s, it can use
them again when the size of xs changes. Here's basic caching in action:

***/
explode = function (xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    var cache = immutable_1.List();
    return size.derive(function (size) {
        if (size > cache.size) {
            // xs got bigger, add more items to the cache
            cache = cache.concat($.Range(cache.size, size).map(function (i) {
                return xs.derive(function (xs) { return xs.get(i); });
            })).toList();
        }
        else {
            // xs is either the same size or smaller, so truncate
            cache = cache.setSize(size);
        }
        return cache;
    });
};
numbers.set(immutable_1.List([1, 2, 3]));
// re-bind cachedDoubled so it uses the new `explode`
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> 4
// $> cd: List [ 2, 4, 6, 8 ]
/***

Wait, that's not right. We don't want the 1, 2, and 3 to be logged again.

Alas, the `map` function rebuilds it's `Derivable<List<Derivable<O>>>` each time its `Derivable<List<Derivable<I>>>` changes. To fix this, `f` needs to be sunk into `explode`.

***/
var mapsplode = function (f, xs) {
    var size = xs.derive(function (xs) { return xs.size; });
    var cache = immutable_1.List();
    return size.derive(function (size) {
        if (size > cache.size) {
            // xs got bigger, add more items to the cache
            cache = cache.concat($.Range(cache.size, size).map(function (i) {
                return xs.derive(function (xs) { return xs.get(i); }).derive(f);
            })).toList();
        }
        else {
            // xs is either the same size or smaller, so truncate
            cache = cache.setSize(size);
        }
        return cache;
    });
};
map = function (f, xs) {
    // just unpack mapsplode output
    return mapsplode(f, xs).derive(mapping(_.unpack));
};
numbers.set(immutable_1.List([1, 2, 3]));
// re-bind cachedDoubled so it uses the new `map`
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]
numbers.set(immutable_1.List([1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get()); //$
// $> 4
// $> cd: List [ 2, 4, 6, 8 ]
/***

Progress!

Unfortunately, we're not quite there yet. Look what happens if you add a number at the beginning rather than at the end:

***/
numbers.set(immutable_1.List([0, 1, 2, 3, 4]));
console.log("cd:", cachedDoubled.get()); //$
// $> 3
// $> 0
// $> 1
// $> 2
// $> 4
// $> cd: List [ 0, 2, 4, 6, 8 ]
/***

This is because the derivations created in `mapsplode` are merely indexing into `xs`. We need some way to associate them with particular values in the list. We could do that if we have some model of what makes the values in the list unique. So in addition to the derivations we could cache a map from those unique ids to their indices in `xs`. Then the derivations would first look up their index in the map before using it to look up their value in `xs`. Here's how that looks:

***/
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
/***

So, to recap, `uf` is our uniqueness function which returns ids for the items in `xs`. We then map those ids to their corresponding indices, and then build a derivation cache based on those ids, which derivations look up their index in `id2idx` which they then use to lookup their value in `xs`. *Phew*. Well done if you're still reading this!

And because we are using immutable data, it is totally possible to just use the identiy function as `uf` most of the time.

***/
mapsplode = function (f, xs) { return mapsplodeU(function (x) { return x; }, f, xs); };
/***

Let's see if that clears things up for us.

***/
numbers.set(immutable_1.List([1, 2, 3]));
// re-bind cachedDoubled so it uses the new `mapsplode`
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]
numbers.set(immutable_1.List([0, 1, 2, 3]));
console.log("cd:", cachedDoubled.get()); //$
// $> 0
// $> cd: List [ 0, 2, 4, 6 ]
/***

That's the ticket.

***/
numbers.set(immutable_1.List([3, 2, 1, 0]));
console.log("cd:", cachedDoubled.get()); //$
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
            // allow duplicates
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
// re-bind cachedDoubled so it uses the new `mapsplodeU`
cachedDoubled = map(logAndDouble, numbers);
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]
numbers.set(immutable_1.List([1, 2, 2]));
console.log("cd:", cachedDoubled.get()); //$
// $> undefined
// $> cd: List [ 2, 4, 4 ]
numbers.set(immutable_1.List([2, 2, 2, 2, 2, 2, 2]));
console.log("cd:", cachedDoubled.get()); //$
// $> undefined
// $> cd: List [ 4, 4, 4, 4, 4, 4, 4 ]
/***

That's the mapping problem solved then. You can supply your own `uf` for efficiency
purposes, but beware that an incorrect `uf` will cause some whack behaviour.

***/
cachedDoubled = mapsplodeU(function (x) { return x % 2; }, logAndDouble, numbers)
    .derive(mapping(_.unpack));
numbers.set(immutable_1.List([1, 2]));
console.log("cd:", cachedDoubled.get()); //$
// $> 1
// $> 2
// $> cd: List [ 2, 4 ]
numbers.set(immutable_1.List([1, 2, 3]));
console.log("cd:", cachedDoubled.get()); //$
// $> 3
// $> cd: List [ 6, 4, 6 ]
numbers.set(immutable_1.List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
console.log("cd:", cachedDoubled.get()); //$
var resplodeU = function (uf, r, xs) {
    // just like before except cache stores reactions rather than derivations
    var cache = immutable_1.Map();
    var _a = deriveIDStuff(uf, xs), ids = _a.ids, id2idx = _a.id2idx;
    // and now instead of deriving a list from `ids`, we simply react to it
    ids.react(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        ids.forEach(function (id) {
            // disallow duplicates
            if (newCache.has(id)) {
                throw new Error("duplicate id '" + id + "'");
            }
            var reaction = cache.get(id);
            if (reaction == null) {
                // implicitly start new reactions
                reaction = xs.derive(lookup, id2idx, id).react(r);
            }
            else {
                // remove from last cache so we don't stop it later
                cache = cache.remove(id);
            }
            newCache.set(id, reaction);
        });
        cache.valueSeq().forEach(function (r) { return r.stop(); });
        cache = newCache.asImmutable();
    });
    return null;
};
var things = derivable_1.atom($.fromJS([{ id: 0, name: "Zero" }, { id: 1, name: "One" }]));
var id = function (x) { return x.get('id'); };
var log = function (x) { return console.log("id: " + id(x) + ", name: " + x.get('name')); };
resplodeU(id, log, things); //$
// $> id: 0, name: Zero
// $> id: 1, name: One
things.swap(function (ts) { return ts.setIn([0, 'name'], "Wilbur"); }); //$
// $> id: 0, name: Wilbur
/***

So we're successfully using the same caching strategy that helped solve the mapping problem.

Note, however, that there is no way for the user to start or stop the individual
reactions. What should `resplodeU` return to enable this? Well an object with
.start and .stop methods which delegate to the underlying reactions would be a
sensible place to begin. Luckily, `Reaction`s already have those methods, we just
need to hook into their onStop and onStart lifecycle methods to propagate runningness
to the underlying reactions.

***/
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
        // re-start reactions to still-valid ids
        ids.get().forEach(function (id) {
            var r;
            if ((r = cache.get(id))) {
                r.start();
            }
        });
    };
    return reaction;
};
// new things because otherwise we'de be getting reactions from before
var things2 = derivable_1.atom($.fromJS([{ id: 0, name: "Zero" }, { id: 1, name: "One" }]));
var reaction = resplodeU(id, log, things2).start().force(); //$
// $> id: 0, name: Zero
// $> id: 1, name: One
things2.swap(function (ts) { return ts.setIn([1, 'name'], "Jefferson"); }); //$
// $> id: 1, name: Jefferson
reaction.stop();
things2.swap(function (ts) { return ts.setIn([0, 'name'], "Thomas"); }); //$
// ... no output
reaction.start();
things2.swap(function (ts) { return ts.setIn([1, 'name'], "The Tank Engine"); }); //$
// $> id: 1, name: The Tank Engine
/***

Further issues:

- Maybe it would be sensible to provide a way to .force individual reactions
- The user should be able to provide a reaction constructor to let them do things
  that a simple reacting function won't.
- propagating indices to reactions in case they need that, like dom nodes might

***/
// (wip)
