<h1 align="center">DerivableJS</h1>
<h3 align="center">State made simple → Effects made easy</h3>

[![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs) [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo) [![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsored%20by-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=derivablejs)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
Derivables are an Observable-like momoizing state container with superpowers. Think [MobX](https://github.com/mobxjs/mobx) distilled to a potent essence, served with extra performance and a garnish of innovative ideas about how to manage side effects.

- [State made simple](#state-made-simple)
  - [Derived and Atomic state](#derived-and-atomic-state)
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

### Derived and Atomic state

We tend not to think about it much, but there are a few different kinds of application state:

- **Constant state** is defined at compile/init time. It never changes for the lifetime of an application and is therefore of no relevance here.

- **Stack state** is created on a runtime call stack and bound to that same stack. e.g. loop variables and intermediate results. It is, at all times, under the influence of only one thread of control.

  Programming languages tend to have nice support for managing stack state and nobody ever complains about it being especially hard. Think lexically-scoped variables, function parameters and return values, RAII, try-catch-finally, and so on.

  Functional programming languages turn the simplicity up a notch here by enabling or enforcing the use of pure functions and immutable data, which are effective tools to restrict the set of ways in which stack state may be updated. Languages opting for the *enforcing* approach, like Haskell, actually *prohibit* directly updating stack state in source code. And this prohibition ends up allowing the compilers to emit machine code capable of all kinds of clever and safe stack mutation.

Some applications need only these two kinds of state, being essentially just functions themselves. e.g. compilers, audio/video transcoders, etc. But the vast majority of applications we use do this other thing where they have internal state which can be modified by external events. They are susceptible to *incursions of control* which carry some piece of data—explicitly or otherwise—through a new call stack, normally causing internal state changes and/or side effects. This internal, changing state can be further categorized:

- **Atomic state** is dependent only on things which have happened in the past to cause incursions of control into the system, e.g. clicking the 'increment' button in a counter app causes the 'count' piece of atomic state to change. If you use Redux, your whole store is atomic state. Other examples of atomic state in a web browser: mouse position, window size, and page scroll offset. On the backend: session data, DB cache, ...

  Modern practices from the FP world are also making atomic state fairly simple to manage. Immutable data and pure functions combine well with things like software transactional memory, the actor model, atomic references, event sourcing, and so on. Again, these are *restrictive* tools for shrinking the set of ways in which state may be updated, all with the apparent added bonus of increasing Reasonaboutability™.

- **Derived state** is directly dependent only on the *current* value of other bits of state. To illustrate:

  - **Whether or not an input form is valid** is dependent on the values currently held in the form's fields.
  - **The number of idle users in an IRC channel** is dependent on the list of all currently-connected users.
  - **The pixel width of a div whose width is specified in percent** is dependent on the current pixel width of its parent.

  Derived state is often also stack state, in that we recompute it on-demand every time it is needed. This is a nicely simple way to go about things because it means that derived state is always consistent with the atomic state it depends upon (possibly indirectly). Alas there are a few drawbacks to this approach:

  - It creates undesirable or untenable **extra load for our CPUs and Garbage Collectors**.
  - It makes it **difficult to keep things DRY** because different concerns might require slightly different permutations or combinations of the same derived state.
  - It makes it **difficult to maintain separation of concerns**, because state dependency relationships freely and rightly span multiple domains within a single app. Knowing how to compute a piece of derived state means knowing what its dependencies are and having access to the appropriate derivation logic.

  We therefore sometimes coerce derived state into atomic state by doing one of two things:

  - **Updating the derived state manually** at the same time as its dependencies. This leaves dependency relationships implicit, requiring the programmer to know about them when making changes (which is basically impossible for non-savants working on real systems). This also makes it extremely difficult to maintain separation of concerns in business logic for the same reason as above (i.e. that dependencies span domains).

  - **Artificially creating new events** to notify others of state changes. This solves the separation of concerns problem, but can still get hellaciously messy in systems with relatively unprincipled approaches to state management and event propagation (think OO, MVC) because the question of *who is responsible for notifying who of what and when* becomes exponentially harder to answer as systems develop over time.

  But even modern principled implementations of this latter approach like Rx/Observables still suffer from a serious drawback: creating artificial events willy-nilly means the state of the world is likely to be inconsistent when event handlers are invoked.

  To illustrate why that's a drawback, here's an example of using RxJS to derive the total number of users in an IRC channel:

  ```javascript
  const numUsers$ = allUsers$.map(users => users.length);
  ```

  *N.B. If you're not familiar with Rx/Observables/'event streams'/'reactive programming', go check out this [supremely excellent introduction](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754) by [@andrestaltz](https://twitter.com/andrestaltz).*

  So far so easy. It's just a pure function being mapped over a 'stream' of values.

  Things get complicated when you need to combine streams. e.g. what if we want to check whether all users are idle, and display a notification if so?

  I'm going to do this in a naïve-but-perfectly-reasonable-seeming way to illustrate a point:

  ```javascript
  // first find out how many idle users there are
  const numIdleUsers$ = allUsers$.map(users =>
    users.filter(user => user.isIdle()).length
  );

  // then just compare that with the total number of users
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

  OK, now suppose that there are three users and two of them are idle so the message is hidden. If an idle user leaves, this is what happens:

  1. `numUsers$` gets set to `2`
  2. `allIdle$` gets set to `true`
  3. the 'all idle' notification is shown
  4. `numIdleUsers$` gets set to `1`
  5. `allIdle$` gets set to `false`
  6. the 'all idle' notification is hidden

  <img src="img/observable-example.svg" align="center" width="89%" />

  You might have noticed that steps 2, 3, 5, and 6 should not have happened. This is what people in the know call a *glitch*.

  The event handler (observables are built on event handlers) which computes the values of the `allIdle$` stream assumes that its inputs, `numUsers$` and `numIdleUsers$`, are consistent with each other. Yeah that's an invalid assumption, but what else can it do? Event handlers *must* assume a consistent world, or be paralyzed by fear. They can't *defer* handling an event until consistency is restored, because who knows how and when that will happen? How do the event handlers even know whether their dependencies are inconsistent in the first place?

  This *inability to defer* requires observable graphs to be traversed depth-first and pre-order, like in the above diagram. This is the cause of glitches, which are just one kind of 'consistency' bug caused by effects being executed at a time when the state of the world is internally inconsistent. Glitches are unique in that the prematurely-executed effects are executed *again* after consistency is restored, making them fairly innocuous when the effects in question are idempotent-ish like rendering views. But what if your network requests are glitchy? What if your atomic state updates are glitchy? Answer: things break.

Derivables are a way to build state dependency graphs without using event handlers. Instead of depth-first evaluation, derivables use a push-pull system: Changes at the roots of the graph cause control to be *pushed* directly to the leaves of the graph, which then *pull* the changes downstream so that inner nodes are always evaluated in the correct order to avoid inconsistency.

Here is how the above example would have panned out if done with derivables:

<img src="img/derivable-example.svg" align="center" width="89%" />

There are three different kinds of entity at play here:

 - Atomic state (`$AllUsers`)
 - Derived state (`$numUsers`, `$numIdleUsers`, and `$allIdle`)
 - Reactor (the thing at the bottom which shows/hides the message)

Derivables explicitly model these three entities and the differences between them. You already know about the first two, and Reactors are like smart event handlers which are only invoked for state change events and are guaranteed to see a consistent view of the world when invoked. More on that later.

Since derivables treat atomic and derived state differently, they can also do a few other novel tricks:

- **Reasonaboutability™ and Wieldiness**

  Observables have notoriously labyrinthine APIs and semantics. Some might argue that it's because they're so powerful, and I would argue that it's because they try to solve a *really goshdarn hard problem*: how to compose event listeners.

  Derivables don't even entertain the thought of tackling that mess. They only do a subset of what Observables try to do, but they do it cleanly and safely with a tight API and oh-so-grokkable semantics. Would you use a chainsaw to dice an onion? I mean, yes, obviously, for science, but shut up you know what I mean.

- **Laziness**

  Derivables have fine-grained laziness, which means that derived values are only computed if you actually need them. This sounds like just a neat trick, but it allows one to do all kinds of insanely practical things, like declaratively encoding true short-circuiting boolean logic.

- **Automatic Memory Management**

  State occupies memory, and if you're using event handlers to update derived state you probably need to worry about the lifecycles of those event handlers in order to avoid memory leaks. Derivables (and some implementations of observables) automatically take care of this. i.e. State containers which aren't being used by active subscriptions can simply be collected by the runtime CG without further ado.

  Again, this sounds like a minor thing at first, but it turns out to be profoundly liberating.

## Effects made easy

The benefits listed above have a shared property: they shrink the set of things you need to worry about in order to write robust code.

- Thanks to guaranteed consistency you don't need to worry about where reactive data comes from.
- Thanks to laziness and garbage collection you don't need to worry about when or even *if* a piece of state you define will be needed.
- Thanks to grokkability you don't need to know some huge API and a bunch of design patterns for avoiding the weird corners.

Having fewer concerns means fewer things can go wrong, so the guiding principle behind the system architecture I'm about to describe is that **everything should have as few concerns as possible**. Sounds obvious, but what does it look like when taken very very seriously indeed?

There are two types of effects in software systems: state updates and side effects. State updates are internal and side effects are external. The only way to create either kind of effect is via incursions of control into the system, i.e. handling external events. So, naïvely speaking, our input event handlers should be concerned with updating state and executing side effects. That's too many concerns I reckon.

In the previous section I described a framework wherein updates to atomic state automatically trigger side effects while automatically and safely updating derived state. So by using that framework, event handlers need only worry about updating atomic state. And, as already discussed, we can keep that very simple with modern functional techniques. In fact, with redux-style event sourcing **event handlers only need to care about translating input events into domain events**, which is almost obscenely simple. So that's the first kind of effect made easy, but what about side effects?

I'm gonna let you in on a little secret here: side effects are just state changes in *other* systems. Right up to the level of electronics and light and sound, all we do as programmers is dictate how systems should influence each others' state.

We can model the reality of this situation acutely with derivables by making liberal use of derived state to describe, in broad strokes, how we want the state of external systems to look when the state of our system looks a certain way. We can then write algorithms or even intermediary systems which know how make the external system's state look like our internal description.

This is more or less the same approach you can find in Facebook's React library. With React you derive a 'virtual' DOM tree from your atomic state, and the framework handles the task of making a real DOM tree look just like the fake one you derived. As a programmer using React, all you need to worry about to robustly render views is *how they should look at a given point in time*. You don't need to know anything about how the reified DOM trees are instantiated or changed over time.

This is nice separation of concerns. How is it different from templating things like, e.g. angular?

ok so that's view rendering but what about other ide effects? Network requests? file I/O? sleep/timeout?

It turns out that React is actually an intermediary system between your domain system and the browser, because it has it's own atomic state. It stores the *last* virtual DOM tree you derived, so that when you derive a new one it can calculate the difference between the two and perform minimal updates to the browser's DOM tree. Maintaining atomic state is the mark of a system.

## Further Reading

- Rich Hickey - Are we there yet
- re-frame README




## Quick start

There are two types of Derivable:

- **Atoms**

  Atoms are simple mutable references to immutable values. They represent the ground truth from which all else is derived.

  ```javascript
  import {atom} from 'derivable';

  const $Name = atom('Richard');

  $Name.get(); // => 'Richard'

  $Name.set('William');

  $Name.get(); // => 'William'
  ```

  <em>N.B. The dollar-sign prefix is just a convention I personally use to create a syntactic distinction between ordinary values and derivable values.</em>

- **Derivations**

  Derivations represent pure (as in 'pure function') transformation of values held in atoms. You can create them with the `.derive` method, which is a bit like the `.map` method of Arrays and Observables.

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

  `derivation` takes a function of zero arguments which should
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

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbmitting).

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
