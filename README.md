<h1 align="center">DerivableJS</h1>
<h3 align="center">State made simple → Effects made easy</h3>

[![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs) [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo) [![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsored%20by-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=derivablejs)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
Derivables are an Observable-like momoizing state container with superpowers. Think [MobX](https://github.com/mobxjs/mobx) distilled to a potent essence, served with extra performance and a garnish of innovative ideas about how to manage side effects.

- [Rationale](#rationale)
  - [Types of State](#types-of-state)
  - [Observables to the rescue?](#observables-to-the-rescue)
  - [Derivables to the actual rescue!](#derivables-to-the-actual-rescue)
- [What even is a Derivable?](#what-even-is-a-derivable)
- [Reactors](#reactors)
- [Usage](#usage)
      - [With React](#with-react)
      - [With Redux](#with-redux)
      - [Debugging](#debugging)
      - [Examples (very wip)](#examples-very-wip)
      - [Browser](#browser)
      - [Equality Woes](#equality-woes)
- [Contributing](#contributing)
- [Thanks](#thanks)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
## State made simple

This is a bold claim, I'll grant you. To be more specific, Derivables make 'derived' state simple, assuming that you already know how to make 'atomic' state simple.

Let me explain just what the heck I'm talking about here.

### Derived and Atomic state

We tend not to think about it much, but there are a few different kinds of application state:

- **Constant state** is defined at compile/init time. It never changes for the lifetime of an application and is therefore of no relevance here.

- **Stack state** is created on and bound to a runtime call stack. e.g. loop variables and intermediate results.

  Programming languages tend to have nice support for managing stack state, and nobody ever complains about it being especially hard (maybe one exception is Forth, which literally provides a stack for managing state).

  Functional programming languages turn the simplicity up a notch here by enabling or enforcing the use of pure functions and immutable data, which are effective tools to restrict the means of updating stack state. Languages which go the *enforcing* route like Haskell actually disallow the direct mutation of stack state (except via black magic).

Some applications need only these two kinds of state, being essentially just functions themselves. e.g. compilers, audio/video transcoders, etc. But the vast majority of applications we use do this other thing where they have internal state which can be modified by external events. They are susceptible to *incursions of control* which carry some piece of data—explicitly or otherwise—through a new call stack, normally causing internal state changes and/or side effects. This internal, changing state can be further categorized:

- **Atomic state** is dependent only on things which have happened in the past to cause incursions of control into the system, e.g. clicking the 'increment' button in a counter app causes the 'count' piece of atomic state to change. If you use Redux, your whole store is atomic state. Other examples of atomic state in a web browser: mouse position, window size, and page scroll offset. On the backend: session data, DB cache, ...

  Modern practices from the FP world are also making atomic state fairly simple to manage. Immutable data and pure functions combine well with things like software transactional memory, the actor model, atomic references, event sourcing, and so on. Again, these are *restrictive* tools for shrinking the set of ways in which state may be updated with the intention of increasing Reasonaboutability™.

- **Derived state** is directly dependent only on the *current* value of other bits of atomic or derived state. To illustrate:

  - Whether or not an input form is valid is dependent on the values currently held in the form's fields.
  - The number of idle users an IRC channel is dependent on the list of all currently-connected users.
  - The pixel width of a div whose width is specified in percent is dependent on the current pixel width of its parent, etc.

  Derived state is often also stack state, in that we recompute it on-demand every time it is needed. This is a nicely simple way to go about things because it means that derived state is always consistent with the atomic state it depends upon (possibly indirectly). Unfortunately, doing this can create undesirable or untenable extra load for our poor CPUs and RAM sticks. It can also be difficult to keep things DRY because different concerns might require slightly different permutations or combinations of the same derived state.

  We therefore sometimes coerce derived state into atomic state by doing one of two things:

   - Updating the derived state manually at the same time as its dependencies. This leaves dependency relationships implicit, requiring the programmer to know about them when making changes (basically impossible for non-savants working on real systems). This also makes it extremely difficult to maintain separation of concerns in business logic because state dependency relationships freely and rightly cross domains.

   - Artificially creating new events to notify others of state changes. This solves the separation of concerns problem, but can still get hellaciously messy for the following reason: event listeners are no longer allowed to assume that they are at the root of a new incursion of control. And yet they do. And yes it matters. A lot.

### Observables to the rescue!

Luckily someone invented a fairly principled way of managing events and state updates that solves most of the problems of dealing with derived state: event streams (as popularized by Rx/Observables).

Observables allow one to define derived state explicitly in terms of other bits of state and have it kept up-to-date automatically.

Here's an example of that using RxJS to derive the total number of users in an IRC channel:

```javascript
const numUsers$ = allUsers$.map(users => users.length);
```

So far so easy. It's just a pure function being mapped over an abstract stream of values in time.

Things get complicated when you need to combine streams. e.g. what if we want to check whether all users are idle, and display a notification if so?

First let's find out how many idle users there are, and then we can just check whether or not that number is the same as the total number of the users.

```javascript
const numIdleUsers$ = allUsers$.map(users =>
  users.filter(user => user.isIdle()).length
);

const allIdle$ = numUsers$.combineLatest(
  numIdleUsers$,
  (a, b) => a === b
);

allIdle$.subscribe(allIdle => {
  if (allIdle) {
    // show notification
  } else {
    // hide notification
  }
});
```

DO GRAPH

OK, now suppose that there are three users and two of them are idle so the message is hidden. If an idle user leaves, this is what happens:

1. `numUsers$` gets set to `2`
2. `allIdle$` gets set to `true`
3. the 'all idle' notification is shown
4. `numIdleUsers$` gets set to `1`
5. `allIdle$` gets set to `false`
6. the 'all idle' notification is hidden

You might have noticed that steps 2, 3, 5, and 6 should not have happened. This is what people in the know call a *glitch*.

So what went wrong? Here's the low-down: Observables are built on top of callbacks, callbacks are all about handling events, and events are all about triggering effects (either state updates or side effects). So when an event happens, you simply *must* notify listeners, otherwise nothing else can happen! But if the listeners have listeners, they have to be notified too, and so on and so forth. This results in a depth-first traversal of the Observable graph which can cause glitchy behavior when the graph is not a tree, as illustrated above. Note that the problem isn't solved by doing breadth-first traversal, you'd need to traverse the graph in topological order (which is totally impractical for mutable callback-based graphs).

### Derivables to the actual rescue!

Derivables get around this problem by using a push-pull system: if atomic state is changed, control is pushed directly to the leaves of the dependency graph which then pull changes down through the graph, automatically ensuring that nodes are evaluated in topological order to avoid glitches.

Since Derivables only have to model atomic and derived state, they can also do a few other things waaay better than Observables:

- **Grokkability and Wieldiness**

  Observables have notoriously labyrinthine APIs and semantics. Some might argue that it's because they're so powerful, and I would argue that it's because they try to do too much. Either way, you don't need that mess. Derivables only do a subset of what Observables try to do, but they do it cleanly and safely. You wouldn't use a chainsaw to dice an onion, would you?

- **Laziness**

  Derivables have fine-grained laziness, which means that values are only computed if you actually need them. This sounds like just a neat trick, but it allows one to do all kinds of insanely practical things, like declaratively encoding true short-circuiting boolean logic.

- **Automatic Memory Management**

  Since Observables are implemented on top of callbacks, you need to explicitly say when you don't need them anymore to avoid memory leaks. Derivables, on the other hand, have the same properties as ordinary JavaScript objects. i.e. if you simply lose your references to them, they go away.

  Again, this sounds like a minor thing at first, but it turns out to be profoundly liberating.

## What even is a Derivable?

There are two types of Derivable:

- **Atoms**

  Atoms are simple references to immutable values. They are the ground truth from which all else is derived.

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

## Usage

DerivableJS is becoming fairly mature, and has been used for serious stuff in production with very few issues. I think it is safe to consider it beta quality at this point.

If your app is non-trivial, use [Immutable](https://facebook.github.io/immutable-js/).

##### With React

[react-derivable](https://github.com/jevakallio/react-derivable) is where it's at.

##### With Redux

DerivableJS can be used as a kind-of replacement for reselect, by just doing something like this:

```javascript
const $Store = atom(null);

myReduxStore.subscribe(() => $Store.set(myReduxStore.getState()));
```

and then you derive all your derived state from $Store, rather than

##### Debugging

Due to inversion of control, the stack traces you get when your derivations throw errors can be totally unhelpful. There is a nice way to solve this problem for dev time. See [setDebugMode](https://ds300.github.com/derivablejs/#derivable-setDebugMode) for more info.

##### Examples (very wip)

The best example of writing good code with Derivables right now is the [talk demo](https://github.com/ds300/derivables-talk-demo), which is presented as a 'diff tutorial' and should be read from the initial commit.

The next best is the [routing walkthrough](https://github.com/ds300/derivablejs/tree/master/examples/routing/README.md)

I've also implemented a solution to @staltz's [flux challenge](https://github.com/staltz/flux-challenge/tree/master/submissions/ds300).

There is a proper gitbook tutorial on the way!

##### Browser
Either with browserify/webpack/common-js-bundler-du-jour or build as umd bundle with `npm run build -- --umd`

##### Equality Woes
JavaScript is entirely whack when it comes to equality. People do [crazy jazz](https://github.com/ramda/ramda/blob/v0.16.0/src/internal/_equals.js) trying to figure out if some stuff is the same as some other stuff.

If the data you're threading through DerivableJS needs its own notion of equality, make sure it has a sensible `.equals` method and everything will be fine.

If you're using a data library with some custom non-standard mechanism for doing equality checks (e.g. mori), then you'll need to re-initialize DerivableJS with a custom equality function.

```javascript
import { withEquality } from 'derivable'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## Contributing

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbitting).

## Thanks

Special thanks to:

- Alan Dipert and Micha Niskin, creators of Javelin (and Boot!). [Their talk on Javelin](http://www.infoq.com/presentations/ClojureScript-Javelin) was the first exposure I had to these ideas.
- Michael Thompson for the [re-frame README](https://github.com/Day8/re-frame). My favourite README of all time. <3
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
