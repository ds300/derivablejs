<h1 align="center">DerivableJS</h1>
<h3 align="center">Observable State done Right</h3>

[![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs)
---

DerivableJS is a JavaScript implementation of **Derivables**.


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Derivables](#derivables)
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

## Derivables

Derivables make it trivial to maintain consistent (i.e. sense-making) state at all times without requiring that it be kept all in one place. This is a huge win for those of us who develop complex systems with lots of moving parts because it eradicates an entire class of subtle-but-devastating bugs along with all the incidental complexity they fed upon, allowing us to spend more quality time getting intimate with our problem domain.

This library satisfies the notion that **changes in state should not cause state changes**, i.e. if the value of state A depends on the value of state B, updates to B should atomically include updates to A—*they should be the same update*. We don't seem to have a handle on this issue, and it causes serious mess in our brains and code.

Derivables clean that mess up by enabling you to make elegant declarative statements about how your bits of state are related. Then, when you update any bits of 'root' state, clever computer-sciency stuff happens in order to keep everything—*every goshdarn thing*—consistent 100% of the time.

There are two types of Derivable:

- **Atoms** are simple references to immutable values. They are the roots; the ground truth from which all else is derived.
- **Derivations** represent pure (as in function) transformation of values held in atoms.

Changes in atoms or derivations can be monitored by **Reactors**, which do not encapsulate values and exist solely for executing side-effects in reaction to state changes. Reactors can also be stopped and restarted when appropriate, and offer lifecycle hooks for the sake of resource management.

Let's have a look at a tiny example app which greets the user:

```javascript
import {atom, derive, transact} from 'derivable'

// global application state
const name = atom("World");     // the name of the user  
const countryCode = atom("en"); // for i18n

// static constants don't need to be wrapped
const greetings = {
  en: "Hello",
  de: "Hallo",
  es: "Hola",
  cn: "您好",
  fr: "Bonjour",
};

// derive a greeting message based on the user's name and country.
const greeting = countryCode.derive(cc => greetings[cc]);
const message = derive`${greeting}, ${name}!`; // es6 tagged template strings!

// set up a Reactor to print the message every time it changes
message.react(msg => console.log(msg));
// $> Hello, World!

countryCode.set("de");
// $> Hallo, World!
name.set("Dagmar");
// $> Hallo, Dagmar!

// we can avoid unwanted intermediate reactions by using transactions
transact(() => {
  countryCode.set("fr");
  name.set("Étienne");
});
// $> Bonjour, Étienne!
```

The structure of this example can be depicted as the following DAG:

<img src="https://ds300.github.com/derivablejs/img/example.svg" align="center" width="89%"/>

The DAG edges are automatically inferred by DerivableJS. It is important to understand that they (the edges) do not represent data flow in any temporal sense. They are not streams or channels or even some kind of callback chain. When you change the value of an atom, its whole propagation graph updates in atomic accord. There is no accessible point in time between the fact of changing an atom and the fact of its dependents becoming aware of the change.

To put it another way: the (atoms + derivations) part of the graph is conceptually a single gestalt reference to a value. In this case the value is a virtual composite of the two atoms' states. The individual nodes are merely views into this value; they constitute the same information presented differently, like light through a prism. The gestalt is always internally consistent no matter which specific parts of it you inspect at any given time.

This property is super important and useful. It cannot be replicated with Observables or any other callback-based mechanism (without doing extra stuff involving topological sorting, and even then only in a single threaded environment).

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
