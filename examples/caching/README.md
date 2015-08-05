

# Caching Derivations

```typescript
import {atom, Atom, Derivable} from 'havelock';
import * as _ from 'havelock';
import {List} from 'immutable';
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
function map<I,O>(f: (x:I) => O, xs: Derivable<List<I>>): Derivable<List<O>> {
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

const cachedDoubled: Derivable<List<number>>
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
them again when the size of xs changes.

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
```
