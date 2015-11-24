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
