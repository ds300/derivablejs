## 1.0.0

- Renamed `lens` to `proxy`, and `isLensed` to `isProxy`
- `derivation` was renamed to `derive`.
- `derive` has a more flexible call signature, where all extra arguments will be unpacked and used as arguments to the function.
- Removed the `lift` method. Instead of `lift(f)`, you can instead do `derive.bind(null, f)`.
- Renamed `swap` to `update`

## 0.12.1

- Removed stray const declarations (thanks, @liron00)

## 0.12.0

### Highlights
- `Derivable#derive` does more stuff (destructuring, property/index lookup, regex matching)
- `Derivable#react` now provides options for declarative lifecycle control.
- Composite Lenses
- Fine-grained Equality checks
- Removed a bunch of API cruft.

### New Stuff

#### Declarative Reactor Lifecycle Control

Prior to this release, the lifecycles of Reactors were controlled imperatively using the`Reactor#start` and `Reactor#stop` methods. This was somewhat verbose and, more importantly, went against the grain of this whole declarative/reactive thing we have going here.

Now there is a better way: providing a lifetime configuration object as a second argument to the `.react` method. Here are the options:

```javascript
interface Lifecycle {
  from?: (() => boolean) | Derivable<boolean>;
  when?: (() => boolean) | Derivable<boolean>;
  until?: (() => boolean) | Derivable<boolean>;
  skipFirst?: boolean;
  once?: boolean;
  onStart?: () => void;
  onStop?: () => void;
}
```
`from` determines this initialization time of the reactor. i.e. when the given derivable becomes truthy, the reactor is initialized.

`when` causes `.start` and `.stop` to be called when the given derivable becomes truthy and falsey respectively (but not before the reactor has been initialized, and not after it has been killed).

`until` causes the reactor to be killed when the given derivable becomes truthy.

`skipFirst` causes the first invocation of the reactor (after it has been initialized, and when `when` is truthy) to be ignored. This is typically used if the state of the world at the time of declaration is such that invoking the reactor would be redundant or harmful.

`once` causes the reactor to be killed immediately following its first invocation.

`onStart` and `onStop` are the same lifecycle hooks that were previously provided.

Example usage:

```typescript
const n = atom(0);

n.react(n => console.log(`n is ${n}`), {
  from: () => n.get() > 0,      // start when n > 0
  when: () => n.get() %2 === 0, // only react when n is even
  until: () => n.get() => 5     // stop when n >= 5
});
// ... no output

n.set(1);
// ... no output (n is odd)

n.set(2);
// $> n is 2

n.set(3);
// ... no output (n is odd)

n.set(4);
// $> n is 4

n.set(5);
// ... no output (reactor was killed)

n.set(4);
// ... no output (reactors don't come back from the dead)
```

#### `Derivable#derive` new capabilities

- RegExp matching

  ```javascript
  const string = atom('hello world');
  const firstLetters = string.derive(/\b\w/g);

  firstLetters.get();
  // => ['h', 'w']
  ```

- Property/Index lookup
  ```javascript
  const obj = atom({foo: 'FOO!'});
  const foo = obj.derive('foo');

  foo.get();
  // => 'FOO!'

  const arr = atom(['one', 'two']);
  const first = arr.derive(0);

  first.get();
  // => 'one'
  ```

- Destructuring
  ```javascript
  const string = atom('hello world')
  const [len, upper, firstChar, words] = string.derive([
    'length', s => s.toUpperCase(), 0, /\w+/g
  ]);
  ```

Also note that these work with derivable versions of the arguments:

```javascript
const arr = atom(['one', 'two', 'three']);
const idx = atom(0);
const item = arr.derive(idx);

item.get();
// => 'one'

idx.set(1);
item.get();
// => 'two'
```



#### Composite Lenses
Previously 'lensed atoms' could only have one underlying atom. It is now possible to lens over an arbitrary number of atoms using the new `CompositeLens` interface:

```typescript
type CompositeLens<T> = {
  // no-arg getter uses lexical closure to deref and combine atoms
  get: () => T,

  // one-arg setter to tease apart the value being set and push it
  // up to the atoms manually
  // runs in an implicit transaction.
  set: (value: T) => void
}
```

Instances of which may be passed to a new 1-arity version of the top-level `lens` function to create lensed atoms:

```typescript
const $FirstName = atom('John');
const $LastName = atom('Steinbeck');

const $Name = lens({
  get: () => $FirstName.get() + ' ' + $LastName.get(),
  set: (val) => {
    const [first, last] = val.split(' ');
    $FirstName.set(first);
    $LastName.set(last);
  }
});

$Name.get(); // => 'John Steinbeck'

$Name.set('James Joyce').

$LastName.get(); // => 'Joyce'
```

#### Fine-grained Equality Control

Because JS has no standard way to override equality comparisons, DerivableJS makes it possible to inject equality-checking logic at the module level using the top-level function [`withEquality`](http://ds300.github.io/derivablejs/#derivable-withEquality) which returns a new instance of DerivableJS using the given equality-checking function.

It is now also possible to do this on a per-derivable basis.

The new `Derivable#withEquality` method creates a clone of a derivable, which new derivable uses the given equality-checking function. It looks like this:

```javascript
import { equals } from 'ramda'

const $Person = atom({name: "Steve"}).withEquality(equals);
$Person.react(({name}) => console.log(`name is ${name}`));
// $> name is Steve

$Person.set({name: "Steve"});
// ... no output (this would print the name again
// if using DerivableJS's standard equality function
// which only does strict-equality (===) checks if no .equals
// method is present on the arguments being compared)
```

#### `atomic`/`atomically`

These new top-level functions are identical to `transaction`/`transact` respectively except that they do not create new (nested) transactions if already in a transaction. This is almost always the desired behaviour, unless you want to gracefully abort transactions.

### Breaking changes:

##### The `Derivable#react` method:
 - no longer returns a Reactor.
 - only accepts functions as the first argument.
 - does not bind the given function to the context of the resultant reactor.

You can get the old behaviour by converting

```javascript
d.react(f);
```
to
```javascript
d.reactor(f).start().force();
```

Although it is recommended to switch to using the new declarative lifecycle stuffs if possible.

##### The `Derivable#reactWhen` method was removed
Use `$d.react(r, {when: $when})`.

##### Dependent reactors are no longer stopped automatically when their governors are.
That was a silly idea...

##### The following top-level functions were removed due to cruftiness:
   - `derive` (except the tagged template string version, that's still there). Use the `Derivable#derive` method instead.
   - `mDerive`. Use the `Derivable#mDerive` method instead.
   - 2+ arity version of `lens`. Use the `Derivable#lens` method instead.
   - `lookup`. Use the `Derivable#derive(string|number)` method instead.
   - `destruct`. Use the `Derivable#derive([string|number])` method instead.
   - `ifThenElse`. Use the `Derivable#then` method instead.
   - `mIfThenElse`. Use the `Derivable#mThen` method instead.
   - `not`. Use the `Derivable#not` method instead.
   - `switchCase`. Use the `Derivable#switch` method instead.
   - `get`. Use the `Derivable#get` method instead.
   - `set`. Use the `Atom#set` method instead.
   - `swap`. Use the `Atom#swap` method instead.


## 0.11.0

#### `Derivable#reactWhen` method

A very common pattern I've needed in my use of DerivableJS has been
starting and stopping some reactor based on the value of some piece
of state. [Dependent Reactors](https://github.com/ds300/derivablejs/issues/16)
were implemented for this very reason, and it seems to be an elegant way to
express many kinds of effectful logic.

This new method enables one to avoid giving the dependent reactor
a lexical binding. e.g. before you would do this:

    const r = $thing.reactor(doEffects);

    $condition.react(cond => {
      if (cond) r.start.force();
      else r.stop();
    };

now you can just write:

    $thing.reactWhen($condition, doEffects);

lemon squeezy

## 0.10.0

#### Debug Mode

Due to inversion of control, the stack traces you get when your derivations or reactors throw errors can be totally unhelpful. This pull request solves that issue by enabling JS Errors to be created (but not thrown) when derivations are instantiated in order to capture the stack trace at the point of instantiation. Then if a derivation throws an error, its instantiation stack trace is logged so we can easily identify exactly which derivation threw the error, and which derivations the error propagated up through.

Creating errors is quite expensive, and can cause noticeable slowdown if there are enough derivations being instantiated, so this mode can be toggled on/off for dev/prod respectively. It is off by default.

See the top-level setDebugMode function.

## 0.9.3

#### TypeScript .d.ts resolution/syntax fixed

It seems like the typescript compiler now figures out how to get the typings
for an npm module by interrogating the "typings" field in its package.json. It
also seems like .d.ts files are now expected to explicitly declare an export.

## 0.9.2

#### Use more conservative equality checks.

This library was using Ramda.js' equality function which does deep
equality checking on ordinary javascript objects. That's all fine, except not
when it sometimes throws up false positives! The newest version fixed that, but
I don't feel comfortable using Ramda's stuff anymore.

Luckily, most of the time identity checks are all we need, and they're lovely
and fast.

People can, of course, still inject their own equality junk if they need extra
protection against redundant computation.

## 0.9.1

New Stuff:

- `adopt` method for allowing reactors to become dependent without needing to be
  started in a reaction cycle. Should have been in 0.8.0.

## 0.9.0

BREAKING CHANGES:

- `some` function renamed to `mIfThenElse`
- `Derivable#some` method renamed to `mThen`

I know this is uglier, but is ultimately consistent with the following:

New Stuff:

- `Derivable#mDerive` for nil-shortcutting derivations, e.g.

  `atom(null).mDerive(x => x.toString()).get()` simply returns `null`, doesn't
  throw an error. Think of it like the elvis operator in c#.

- `Derivable#mOr` for nil-only 'or' semantics e.g.

  `atom(false).mOr(5) === false` while `atom(false).or(5) === 5`

- `Derivable#mAnd` for nil-only 'and' semantics e.g.

  `atom('').mAnd(5) === 5` while `atom('').and(5) === ''`

- top level functions `mDerive`, `mOr` and `mAnd` for the above.

- top level function `lookup` for performing ordinary javascript property lookup
  on derivables.

- top level function `destruct` for destructuring derivables. <3 this function.

## 0.8.0

BREAKING CHANGES:

- Reaction class renamed to Reactor
- Derivable#reaction method renamed to Derivable#reactor

Other Changes

Reactors can now 'depend' on other reactors. That is, if Reactor A starts
Reactor B (via the Reactor#start method), B is said to be dependent on A. If A
is stopped, B will be also be stopped (but if A is started, B is not also
started). More importantly, if A and B need to react to the same change, A is
guaranteed to react *before* B. This lets reactors control each other's
lifecycles without fear of race conditions.

Reactors now have a method Reactor#orphan which removes any dependency the
reactor has.

A minor bug involving creating reactors within transactions was fixed.


## 0.7.1

Fix bug where parents were being traversed in the wrong order during reaction
phases. This precluded true laziness in some cases.

## 0.7.0

Rename Havelock to DerivableJS

## 0.6.0

`some` fn and method for derivables. Like `if` but for null/undefined checks
rather than truthiness checks.

## 0.5.1

Cycle checks now catch all cases.

## 0.5.0

Custom reaction intervals

## 0.4.2

Cyclical graph structures disallowed again. They are nice but incompatible with
havelock's central tenets of laziness, consistency, and automatic memory management.

## 0.4.1

Cyclical graph structures now allowed. You get stack overflows if you make an
infinitely-repeating cycle.

## 0.4.0

- `transaction`-ized functions can now return a value
- `struct` only accepts plain objects and arrays
- `defaultEquals` exposed for use when writing custom equality-checking functions.

## 0.3.2

.d.ts reinstated

## 0.3.1

Fix transaction abortion sweep bug.

## 0.3.0

- Fallback to ES5 for implementation. Babel was doing weird junk and I don't want
to have to deal with that again.
- Introduce `transaction` function. no api docs yet.

## 0.2.3

Fixed parent management bug for disowned children.

## 0.2.2

Switched to Apache 2.0 license.

## 0.2.1

sorted out npm module to only include dist.

## 0.2.0

- changed behaviour of method `Derivable::derive` to work like `swap` in terms
  of arguments. e.g. now you can do `let five = three.derive(plus, two)`;
- changed function `derive` to match. i.e. it is now just a functional interface
  to the method.
- new function `derivation(f)` which does what `derive(f)` used to do.
derive
