

# Caching Derivations

```typescript
import {atom, Atom, Derivable} from 'havelock';
import * as _ from 'havelock';
import {List, Map} from 'immutable';
import * as $ from 'immutable';
```


#### Probelm

You've got a derivable list of values, and you want to map some function over
them to create a new derivable list of values. Here's the obvious way to do it:

```typescript
const numbers: Atom<List<number>> = atom(List([1,2,3]));
const doubled: Derivable<List<number>> = numbers.derive(xs => {
  return xs.map(x => x * 2).toList();
});
```


The problem with this is that each time `numbers` changes, every item in it is reprocessed. This isn't so bad when all you're doing is doubling an integer, but it would be nice to have a way to avoid doing the mapping for values that don't change. This could be very beneficial if the cost of the mapping dwarfs the overhead involved in figuring out which items have changed etc.

Another related problem situation is if you have a list whose contents might change in any way, but you want to react to changes in list items individually. There's no obvious way to do that with havelock straight out of the box.

Let's call the first problem 'the mapping problem' and the second 'the reacting problem' for brevity's sake.

#### Solution

The solution starts out by taking the derivable list of values and converting it into a derivable list of derivable values. i.e. `derivable<list<T>> -> derivable<list<derivable<T>>>`.

That might look like this (forgive the weird declaration, we'll need to rebind it later):

```typescript
let explode: <T>(xs: Derivable<List<T>>) => Derivable<List<Derivable<T>>>
= xs => {
  const size = xs.derive(xs => xs.size);
  return size.derive(size => {
    return $.Range(0, size).map(i => xs.derive(xs => xs.get(i))).toList();
  });
}
```


*Please don't freak out about the nested derivableness. It's fine. Honest.*

So for every index in `xs`, we create a new derivable which simply looks up that index. Now we can partially solve the mapping problem

```typescript
let map: <I,O>(f: (x:I) => O, xs: Derivable<List<I>>) => Derivable<List<O>>
= <I,O>(f: (x:I) => O, xs: Derivable<List<I>>) => {
  // first get the list of derivables
  let dxsI: Derivable<List<Derivable<I>>> = explode(xs);
  // now map f over the derivables
  let dxsO: Derivable<List<Derivable<O>>> = dxsI.derive(dxs => {
    return dxs.map(dx => dx.derive(f)).toList();
  });
  // so at this point the Derivable<O>s only get recalculated when the
  // Derivable<I>s change. And, if you'll remember, the Derivable<I>s
  // get recalculated whenever xs changes, but they might not have changed.

  // and finally unpack
  return dxsO.derive(dxs => dxs.map(_.get).toList());
  // so the result List<O> gets rebuilt whenever any one of the Derivable<O>s
  // changes. This is as good as it gets with immutable collections.
}

let cachedDoubled: Derivable<List<number>>
  = map(x => {console.log(x); return x*2;}, numbers);

console.log("cd:", cachedDoubled.get());
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]

numbers.set(List([1, 10, 3]));

console.log("cd:", cachedDoubled.get());
// $> 10
// $> cd: List [ 2, 20, 6 ]
```


The reason this is only a partial solution is that if `xs` changes in length, all the derivations get regenerated which means all the values get recomputed.

```typescript
console.log("cd:", cachedDoubled.get());

numbers.set(List([1, 2, 3, 4]));

console.log("cd:", cachedDoubled.get());
// $> 1
// $> 2
// $> 3
// $> 4
// $> cd: List [ 2, 4, 6, 8 ]
```


So how to avoid this? Caching! If `explode` caches the `Derivable<T>`s, it can use
them again when the size of xs changes. Here's basic caching in action:

```typescript
explode = <T>(xs: Derivable<List<T>>): Derivable<List<Derivable<T>>> => {
  const size = xs.derive(xs => xs.size);

  let cache: List<Derivable<T>> = List<Derivable<T>>();

  return size.derive(size => {
    if (size > cache.size) {
      // xs got bigger, add more items to the cache
      cache = cache.concat($.Range(cache.size, size).map(i => {
        return xs.derive(xs => xs.get(i));
      })).toList();
    } else {
      // xs is either the same size or smaller, so truncate
      cache = cache.setSize(size);
    }
    return cache;
  });
}

numbers.set(List([1,2,3]));

// re-bind cachedDoubled so it uses the new `explode`
cachedDoubled = map(x => {console.log(x); return x*2;}, numbers);

console.log("cd:", cachedDoubled.get());
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]

numbers.set(List([1,2,3,4]));

console.log("cd:", cachedDoubled.get());
// 1
// 2
// 3
// 4
// cd: List [ 2, 4, 6, 8 ]
```


Wait, that's not right. We don't want the 1, 2, and 3 to be logged again.

Alas, the `map` function rebuilds it's `Derivable<List<Derivable<O>>>` each time its `Derivable<List<Derivable<I>>>` changes. To fix this, `f` needs to be propagated into `explode`.

```typescript
let mapsplode: <I, O>(f: (v:I) => O, xs: Derivable<List<I>>) => Derivable<List<Derivable<O>>>
= <I, O>(f, xs) => {
  const size = xs.derive(xs => xs.size);

  let cache: List<Derivable<O>> = List<Derivable<O>>();

  return size.derive(size => {
    if (size > cache.size) {
      // xs got bigger, add more items to the cache
      cache = cache.concat($.Range(cache.size, size).map(i => {
        return xs.derive(xs => xs.get(i)).derive(f);
      })).toList();
    } else {
      // xs is either the same size or smaller, so truncate
      cache = cache.setSize(size);
    }
    return cache;
  });
}

map = <I, O>(f: (v:I) => O, xs: Derivable<List<I>>) => {
  // just unpack mapsplode output
  return mapsplode(f, xs).derive(dxs => dxs.map(_.get).toList());
};

numbers.set(List([1,2,3]));

// re-bind cachedDoubled so it uses the new `map`
cachedDoubled = map(x => {console.log(x); return x*2;}, numbers);

console.log("cd:", cachedDoubled.get());
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]

numbers.set(List([1,2,3,4]));

console.log("cd:", cachedDoubled.get());
// 4
// cd: List [ 2, 4, 6, 8 ]
```


Progress!

Unfortunately, we're not quite there yet. Look what happens if you add a number at the beginning rather than at the end:

```typescript
numbers.set(List([0,1,2,3,4]));

console.log("cd:", cachedDoubled.get());
// $> 0
// $> 1
// $> 2
// $> 3
// $> 4
// $> cd: List [ 0, 2, 4, 6, 8 ]
```


This is because the derivations created in `mapsplode` are merely indexing into `xs`. We need some way to associate them with particular values in the list. We could do that if we have some model of what makes the values in the list unique. So in addition to the derivations we could cache a map from those unique ids to their indices in `xs`. Then the derivations would first look up their index in the map before using it to look up their value in `xs`. Here's how that looks:

```typescript
let mapsplodeU: <I, O, U>(uf: (v:I) => U, f: (v:I) => O, xs: Derivable<List<I>>) => Derivable<List<Derivable<O>>>
= <I, O, U>(uf, f, xs) => {
  let cache: Map<U, Derivable<O>> = Map<U, Derivable<O>>();

  const ids: Derivable<List<U>> = xs.derive(xs => xs.map(uf).toList());
  const id2idx: Derivable<Map<U, number>> = ids.derive(ids => {
    let map = Map<U, number>().asMutable();
    ids.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map.asMutable();
  });

  return ids.derive(ids => {
    let newCache = Map<U, Derivable<O>>().asMutable();
    let result = [];

    ids.forEach(id => {
      if (newCache.has(id)) {
        throw new Error(`duplicate id ${id}`);
      }
      let derivation: Derivable<O> = cache.get(id);
      if (derivation == null) {
        derivation = xs.derive(xs => xs.get(id2idx.get().get(id))).derive(f);
      }
      newCache.set(id, derivation);
      result.push(derivation);
    });

    cache = newCache.asImmutable();
    return List(result);
  });
}
```


So, to recap, `uf` is our uniqueness function which returns ids for the items in `xs`. We then map those ids to their corresponding indices, and then build a derivation cache based on those ids, which derivations look up their index in `id2idx` which they then use to lookup their value in `xs`. *Phew*. Well done if you're still reading this!

And because we are using immutable data, it is totally possible to just use the identiy function as `uf` most of the time.

```typescript
mapsplode = <I, O>(f, xs) => mapsplodeU(x => x, f, xs);
```


Let's see if that clears things up for us.

```typescript
numbers.set(List([1,2,3]));

// re-bind cachedDoubled so it uses the new `mapsplode`
cachedDoubled = map(x => {console.log(x); return x*2;}, numbers);

console.log("cd:", cachedDoubled.get());
// $> 1
// $> 2
// $> 3
// $> cd: List [ 2, 4, 6 ]

numbers.set(List([0,1,2,3]));
console.log("cd:", cachedDoubled.get());
// $> 0
// $> cd: List [ 0, 2, 4, 6 ]
```


That's the ticket.

```typescript
numbers.set(List([3,2,1,0]));
console.log("cd:", cachedDoubled.get());
// $> cd: List [ 6, 4, 2, 0 ]
```


Aww yiss.

So that's *almost* the whole story. The one last wrinkle is the whole duplicate ID thing. Because we're using Immutable data, duplicates are fine as long as the uniqueness function is correct.
