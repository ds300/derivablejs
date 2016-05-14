<h1 align="center">DerivableJS</h1>
<h3 align="center">State Made Simple → Effects Made Easy</h3>

[![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs) [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
Derivables are an observable-like state container with superpowers. This library is similar to [MobX](https://github.com/mobxjs/mobx), but distilled to a potent essence, and faster. LINKY

- [Derivation vs Observation](#derivation-vs-observation)
- [Derivables](#derivables)
- [Reactors](#reactors)
  - [Tradeoffs](#tradeoffs)
- [Usage](#usage)
      - [API](#api)
      - [Debugging](#debugging)
      - [Examples (very wip)](#examples-very-wip)
      - [npm](#npm)
      - [Browser](#browser)
      - [Batteries Not Included](#batteries-not-included)
      - [Equality Woes](#equality-woes)
- [1.0.0 Roadmap](#100-roadmap)
- [Future Work](#future-work)
- [Contributing](#contributing)
- [Thanks](#thanks)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Types of State

We tend not to think about this stuff explicitly, but there are a few different kinds of application state:

- **Constant state**

  Defined at compile/init time and never changes for the lifetime of an application. Super boring.

- **Stack state**

  Created on the call stack. May be passed to and from functions, but never escapes the call stack on which it was created. e.g. loop variables and intermediate results. Programming languages tend to have really high-quality support for managing stack state, and nobody ever complains about it being hard (one exception I can think of off the top of my head would be Forth).

- **Atomic state**

  This is state which persists across call stacks; where an individual call stack is associated with something like an external event being triggered or a task being scheduled by an event loop. i.e. an incursion of control into the system.

  The value of a piece of atomic state is dependent only on things which have happened in the past to cause incursions of control into the system. Things like clicking a button or receiving a network request. Input events. Examples of atomic state would be things like normalized in-memory databases, redux stores, local caches of data stored elsewhere, etc.

- **Derivative state**

  This is state whose value depends only on the *current* value of other bits of state, e.g. a virtual DOM tree in a React application, whether or not an input form is valid, the number of users currently connected to an IRC channel, etc. We tend to turn derivative state into stack state (i.e. we recompute it every time it is needed) as much as possible because otherwise it can be extremely hard to keep up-to-date.

## Derivables

Derivables are an observable-like state container which satisfy the notion that **state changes should not cascade over time**, e.g. if the value of state A depends on the value of state B, updates to B should atomically include updates to A—*they should be the same update*, i.e. there should be no accessible point in time where A has been updated but B has not. We don't seem to have a handle on this issue, and it causes serious mess in our brains and code.

This library cleans that mess up by enabling you to make pure declarative statements about how your bits of state depend on each other. Then, when you update any bits of 'root' state, clever computer-sciency stuff happens in order to keep everything in synch. Observables based on event streams (e.g. in Rx, Bacon, Kefir, xstream, ...) can't guarantee this because they conflate two very different concerns: event handling and state updates. This is also one of the reasons they have such notoriously labyrinthine APIs.

Since Derivables focus only on state updates, they are remarkably reasonaboutable and have a clean and concise API. They can also do a couple of other things which Observables can't:

- **Laziness**:

  Derivables have fine-grained laziness, which means that only the things you actually need to know about right now are kept up to date. This sounds like just a neat trick, but it allows one to do all kinds of immensely practical things. More on that later.

- **Automatic Memory Management**

  Observables are implemented on top of callbacks, which means you need to explicitly say when you don't need them anymore to avoid memory leaks. Derivables, on the other hand, have the same properties as ordinary JavaScript objects. i.e. if you simply lose your references to them, they go away.

  Again, this sounds like a minor thing at first, but turns out to be profoundly liberating.

There are two types of Derivable:

- **Atoms**

  Atoms are simple references to immutable values. They are the 'root' state mentioned before: the ground truth from which all else is derived.

  ```javascript
  import {atom} from 'derivable';

  const $Name = atom('Richard');

  $Name.get(); // => 'Richard'

  $Name.set('William');

  $Name.get(); // => 'William'
  ```

  <em>N.B. The dollar-sign prefix is just a convention I personally use to create a syntactic distinction between ordinary values and derivable values.</em>

- **Derivations**

  Derivations represent pure (as in 'pure function') transformation of values held in atoms. You can create them with the `.derive` method, which is a bit like the `.map` method of Observables.

  ```javascript
  const cyber = word => word.toUpperCase().split('').join(' ');

  const $cyberName = $Name.derive(cyber);

  $cyberName.get(); // 'W I L L I A M'

  $Name.set('Sarah');

  $cyberName.get(); // 'S A R A H'
  ```

  Derivations cannot be modified directly with `.set`, but change in accordance with their dependencies, of which there may be many. Here is an example with two dependencies which uses the fundamental `derivation` constructor function:

  ```javascript
  import {derivation} from 'derivable';

  const $Transformer = atom(cyber);

  const $transformedName = derivation(() =>
    $Transformer.get()($Name.get())
  );

  $transformedName.get(); // => 'S A R A H'

  const reverse = string => string.split('').reverse().join('');

  $Transformer.set(reverse);

  $transformedName.get(); // => 'haraS'

  $Name.set('Fabian');

  $transformedName.get(); // => 'naibaF'
  ```

  `derivation` takes another function of zero arguments which should
  dereference one or more Derivables to compute the new derived value. DerivableJS then sneakily monitors who
  is dereferencing who to infer the parent-child relationships.

## Reactors

Declarative state management is nice in and of itself, but the real benefits come from how it enables us to more effectively manage side effects. DerivableJS has a really nice story on this front: changes in atoms or derivations can be monitored by things called **Reactors**, which do not themselves have any kind of 'current value', but are more like independent agents which exist solely for executing side effects.

Let's have a look at a tiny example app which greets the user:

```javascript
import {atom, derivation, transact} from 'derivable'

// global application state
const $Name = atom("World");     // the name of the user  
const $CountryCode = atom("en"); // for i18n

// static constants don't need to be wrapped
const greetings = {
  en: "Hello",
  de: "Hallo",
  es: "Hola",
  cn: "您好",
  fr: "Bonjour",
};

// derive a greeting message based on the user's name and country.
const $greeting = $CountryCode.derive(cc => greetings[cc]);
const $message = derivation(() =>
  `${$greeting.get()}, ${$name.get()}!`
);

// set up a Reactor to print the message every time it changes, as long as
// we know how to greet people in the current country.
$message.react(
  msg => console.log(msg),
  {when: $greeting}
);
// $> Hello, World!

$CountryCode.set("de");
// $> Hallo, World!
$Name.set("Dagmar");
// $> Hallo, Dagmar!

// we can avoid unwanted intermediate reactions by using transactions
transact(() => {
  $CountryCode.set("fr");
  $Name.set("Étienne");
});
// $> Bonjour, Étienne!

// if we set the country code to a country whose greeting we don't know,
// $greeting becomes undefined, so the $message reactor won't run
// In fact, the value of $message won't even be recomputed.
$CountryCode.set('dk');
// ... crickets chirping
```

The structure of this example can be depicted as the following DAG:

<img src="https://ds300.github.com/derivablejs/img/example.svg" align="center" width="89%"/>

The DAG edges are automatically inferred by DerivableJS. It is important to understand that they (the edges) do not represent data flow in any temporal sense. They are not streams or channels or even some kind of callback chain. When you change the value of an atom, its whole propagation graph updates in atomic accord. There is no accessible point in time between the fact of changing an atom and the fact of its dependents becoming aware of the change.

To put it another way: the (atoms + derivations) part of the graph is conceptually a single gestalt reference to a value. In this case the value is a virtual composite of the two atoms' states. The individual nodes are merely views into this value; they constitute the same information presented differently, like light through a prism. The gestalt is always internally consistent no matter which specific parts of it you inspect at any given time.

This property is super important and useful. It cannot be replicated with Observables or any other callback-based mechanism (without doing extra impractical stuff involving topological sorting).

The other thing which truly sets derivations apart is that they are *totally lazy*. Like values in Haskell they are computed just-in-time, i.e. on demand. This is another huge win because:

- It decouples the computational complexity of updating atoms with that of computing their derivations. Derivations are only re-computed at atom-change time if they (the derivations) are actually used by an affected reactor. So, for example, you can declare an eternal relationship between *n* and *n*<sup>2</sup> without needing to fear the cost of re-computing *n*<sup>2</sup> every time *n* changes. That fear is transferred to whoever decides that they want to know the value of *n*<sup>2</sup> at all times, which is just how it should be.
- It allows derivations to be automatically garbage collected when you don't need them any more, just like any other object. This is simple to the max! In fact, you don't need any special knowledge to avoid memory leaks with DerivableJS—it Just Works.
- It permits true short-circuiting boolean logic in derivation structures, which turns out to be extraordinarily practical.


### Tradeoffs

You may be wondering how these benefits are achieved. The answer is simple: mark-and-sweep. Yes, [just like your trusty Garbage Collectors](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Basic_algorithm) have been doing since the dawn of Lisp. It is actually more like mark-*react*-sweep, and it brings a couple of performance hits over streams, channels, and callback chains:

* When an atom is changed, its entire derivation graph is traversed and 'marked'. All active reactors found in the graph are then gently prodded and told to decide whether they need to re-run themselves. This amounts to an additional whole-graph traversal in the worst case. The worst case also happens to be the common case :(
* The sweep phase involves yet another probably-whole-graph traversal.

So really each time an atom is changed, its entire derivation graph is likely to be traversed 3 times. I would argue that this is negligible for most UI-ish use cases. The traversal is really simple stuff: following pointers and doing numeric assignments/comparisons. Computers are stupidly good at that kind of thing. But if you're doing something *intense* then perhaps DerivableJS isn't the best choice and you should pick something with eager evaluation. Be appraised, however, that I've got a [fairly promising idea](#future-work) for how to reduce the traversal overhead after v1.0.0 drops.

*Side note: during transactions only the mark phase occurs. And if an atom is changed more than once during a single transaction, only the bits of the derivation graph that get dereferenced between changes are re-marked.*

A final potential drawback is that DerivableJS requires one to think and design in terms of pure functions and immutable data being lazily computed, which I think takes a little while to get comfortable with coming directly from an OO background.

## Usage

DerivableJS is still quite new, but has been used for serious stuff in production. I think it is safe to consider it beta quality at this point.

##### API
[See Here](https://ds300.github.com/derivablejs)

##### Debugging

Due to inversion of control, the stack traces you get when your derivations throw errors can be totally unhelpful. There is a nice way to solve this problem for dev time. See [setDebugMode](https://ds300.github.com/derivablejs/#derivable-setDebugMode) for more info.

##### Examples (very wip)

The best example of writing good code with Derivables right now is the [talk demo](https://github.com/ds300/derivables-talk-demo), which is presented as a 'diff tutorial' and should be read from the initial commit.

The next best is the [routing walkthrough](https://github.com/ds300/derivablejs/tree/master/examples/routing/README.md)

I've also implemented a solution to @staltz's [flux challenge](https://github.com/staltz/flux-challenge/tree/master/submissions/ds300).

And there are a few others [here](https://github.com/ds300/derivablejs/tree/master/examples/) too.

More coming!


##### npm
Available as `derivable`.

##### Browser
Either with browserify or, if need be, import `dist/derivable.min.js` directly (find it at `window.Derivable`).

##### Batteries Not Included
DerivableJS expects you to use immutable (or effectively immutable) data. It also expects derivation functions to be pure. JavaScript isn't really set up to handle such requirements out of the box, so you would do well to look at an FP library like [Ramda](http://ramdajs.com/) to make life easier. Also, if you want to do immutable collections properly, [Immutable](https://facebook.github.io/immutable-js/) or [Mori](http://swannodette.github.io/mori/) are probably the way to go. Godspeed!

##### Equality Woes
JavaScript is entirely whack when it comes to equality. People do [crazy jazz](https://github.com/ramda/ramda/blob/v0.16.0/src/internal/_equals.js) trying to figure out if some stuff is the same as some other stuff.

If the data you're threading through DerivableJS needs its own notion of equality, make sure it has a `.equals` method and everything will be fine.

If you're using a data library with some custom non-standard mechanism for doing equality checks (e.g. Mori), then you'll need to re-initialize DerivableJS with a custom equality function.

```javascript
import { withEquality } from 'derivable'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## 1.0.0 Roadmap

DerivableJS's API will be unstable until version 1.0.0 is released, whereafter the project will use [Semantic Versioning](http://semver.org/).

I plan to wait for the project to pick up a bit more steam so I can get serious community feedback before pumping out a 1.0.0 release. This is to allow for breaking changes if the need arises.

## Future Work

1. <s>Shrink the code base. It is currently 5.4k minified and gzipped, but I didn't write the code with size in mind so I think it can get much smaller.</s> now about 3.6k, but could probably get smaller still
1. Dynamic graph optimization. e.g. collapsing derivation branches of frequently-executed reactions into one derivation, maybe trying to align all the data in memory somehow. This would be similar to JIT tracing sans optimization, and could make enormous derivation graphs more feasible (i.e. change propagation could become linear in the number of reactors rather than linear in the number of derivation nodes. It wouldn't work with parent inference though; you'd have to write derivations in the `x.derive((x, y, z) => ..., y, z)` or `derive(x, (x, y, z) => ..., y z)` fashions. So do that if you want to get ahead of the curve!
2. Investigate whether asynchronous transactions are possible, or indeed desirable.
3. <s>Investigate debugging support.</s> - implemented in 0.10.0
4. I've got a feeling one of the whole-graph traversals mentioned in [Tradeoffs](#tradeoffs) can be eliminated while maintaining all the goodness DerivableJS currently provides, but it would involve a lot of extra caching and it won't even be needed if (1) turns out to be fruitful, so I'll try that first.

## Contributing

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbitting).

## Thanks

Special thanks to:

- The [Futurice open source sponsorship program](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=progressbar) for funding recent development.
- Alan Dipert and Micha Niskin, creators of Javelin (and Boot!). [Their talk on Javelin](http://www.infoq.com/presentations/ClojureScript-Javelin) was the first exposure I had to these ideas.
- Michael Thompson for the [re-frame README](https://github.com/Day8/re-frame) which was an awesome resource and gave me enough enthusiasm for the idea to hunker down and do it.
- David Weir and Jeremy Reffin for their invaluable mentorship.
- Rich Hickey and the Clojure community for being a constant source of ideas and for making programming even more fun.

## License

```
Copyright 2015 David Sheldrick <djsheldrick@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
