<h1 align="center">DerivableJS</h1>
<h3 align="center">State Made Simple → Effects Made Easy</h3>

[![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs) [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
Derivables are an observable-like state container with superpowers. This library is similar to [MobX](https://github.com/mobxjs/mobx), but distilled to a potent essence, faster, and with a strong focus on making side effects easy to manage. LINKY

`npm install derivable`

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
## Rationale

### Types of State

We tend not to think about it much, but there are a few different kinds of application state:

- **Constant state**

  Defined at compile/init time and never changes for the lifetime of an application. Super boring.

- **Stack state**

  Created on the call stack. May be passed to and from functions, but never escapes the call stack on which it was created. e.g. loop variables and intermediate results. Programming languages tend to have really high-quality support for managing stack state, and nobody ever complains about it being hard (one exception I can think of off the top of my head would be Forth).

Some applications get by just fine with only these two kinds of state. Such applications are essentially just functions themselves, e.g. compilers, audio/video transcoders, etc. But the vast majority of applications we use do this other thing where they have internal state which can be modified by external events. They are susceptible to *incursions of control* which carry some piece of data—implicit or otherwise—through a new call stack, normally resulting in state changes and/or side effects. This internal, changing state can be further categorized:

- **Atomic state**

  Dependent only on things which have happened in the past to cause incursions of control into the system, e.g. clicking the 'increment' button in a counter app causes the 'count' piece of atomic state to change. If you use Redux, your store is atomic state. Other examples of atomic state in a web app: mouse position, window size, page scroll offset, etc. On the backend: session data, DB cache, etc.

- **Derivative state**

  Dependent only on the *current* value of other bits of atomic or derivative state, e.g. a virtual DOM tree in a React application, whether or not an input form is valid, the number of users currently connected to an IRC channel, the width in pixels of a div whose width is specified in percent, etc. We tend to coerce derivative state into stack state (by recomputing it every time it is needed) or atomic state (by updating it manually at the same time as its dependencies) because our programming languages lack good built-in tools for managing derivative state.

### Observables

Observables are a decent tool for managing derivative state. They allow one to define it explicitly in terms of other bits of state and have it kept up-to-date automatically.

Here's an example of that using RxJS to derive the number of users in an IRC channel:

```javascript
const numUsers$ = channelUsers$.map(users => users.length);
```

Super easy right? What about if we want to check whether all users are in invisible mode, and display a notification if so?

```javascript
const numInvisibleUsers$ = channelUsers$.map(users =>
  users.filter(user => user.isInvisible()).length
);

const allInvisible$ = numUsers$.combineLatest(
  numInvisibleUsers$,
  (a, b) => a === b
);

allInvisible$.subscribe(allInvisible => {
  if (allInvisible) {
    // show notification
  } else {
    // hide notification
  }
});
```

OK, now suppose that there are three users and two of them are invisible so the message is hidden. If an invisible user leaves, this is what happens:

1. `numUsers$` gets set to `2`
2. `allInvisible$` gets set to `true` (because `numInvisibleUsers$` hasn't been updated yet)
3. the 'all invisible' notification is shown
4. `numInvisibleUsers$` gets set to `1`
5. `allInvisible$` gets set to `false`
6. the 'all invisible' notification is hidden

You might have noticed that steps 2, 3, 5, and 6 should not have happened. This is what people in the know call a *glitch*.

So what went wrong? Here's the low-down: Observables are built on top of callbacks, callbacks are all about handling events, and events are all about triggering effects (either state updates or side effects). So when an event is triggered, you simply *must* notify listeners, otherwise nothing happens! But if the listeners have listeners, they have to be notified too! This results in a depth-first traversal of the Observable graph which can cause glitchy behavior as illustrated above.

Derivables get around this problem by using a push-pull system: if atomic state is changed, control is pushed directly to the leaves of the dependency graph which then pull changes down through the graph, automatically ensuring that nodes are evaluated in the correct order to avoid glitches.

Since Derivables only have to model atomic and derivative state, they can do a few things waaay better than Observables:

- **Grokkability/Wieldiness**

  Observables have notoriously labyrinthine APIs and semantics. Some might argue that it's because they're so powerful, but I would argue that it's because they try to do too much. You don't need that mess. Derivables only do a subset of what Observables try to do, but they do it cleanly and safely. You wouldn't use a chainsaw to dice an onion, would you?

- **Laziness**:

  Derivables have fine-grained laziness, which means that only the things you actually need to know about right now are kept up-to-date. This sounds like just a neat trick, but it allows one to do all kinds of insanely practical things. More on that later.

- **Automatic Memory Management**

  Since Observables are implemented on top of callbacks, you need to explicitly say when you don't need them anymore to avoid memory leaks. Derivables, on the other hand, have the same properties as ordinary JavaScript objects. i.e. if you simply lose your references to them, they go away.

  Again, this sounds like a minor thing at first, but it turns out to be profoundly liberating.

### Derivables

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

DerivableJS is still quite new, but has been used for serious stuff in production. I think it is safe to consider it beta quality at this point.

##### API
[See Here](https://ds300.github.com/derivablejs)

##### Debugging

Due to inversion of control, the stack traces you get when your derivations throw errors can be totally unhelpful. There is a nice way to solve this problem for dev time. See [setDebugMode](https://ds300.github.com/derivablejs/#derivable-setDebugMode) for more info.

##### Examples (very wip)

The best example of writing good code with Derivables right now is the [talk demo](https://github.com/ds300/derivables-talk-demo), which is presented as a 'diff tutorial' and should be read from the initial commit.

The next best is the [routing walkthrough](https://github.com/ds300/derivablejs/tree/master/examples/routing/README.md)

I've also implemented a solution to @staltz's [flux challenge](https://github.com/staltz/flux-challenge/tree/master/submissions/ds300).

There is a proper gitbook tutorial on the way!

##### npm
Available as `derivable`.

##### Browser
Either with browserify/webpack/common-js-bundler-du-jour or build as umd bundle with `npm run build -- --umd`

##### Batteries Not Included
DerivableJS expects you to use immutable (or effectively immutable) data. It also expects derivation functions to be pure. JavaScript isn't really set up to handle such requirements out of the box, so get yoself some [Immutable](https://facebook.github.io/immutable-js/) datas.

##### Equality Woes
JavaScript is entirely whack when it comes to equality. People do [crazy jazz](https://github.com/ramda/ramda/blob/v0.16.0/src/internal/_equals.js) trying to figure out if some stuff is the same as some other stuff.

If the data you're threading through DerivableJS needs its own notion of equality, make sure it has a sensible `.equals` method and everything will be fine.

If you're using a data library with some custom non-standard mechanism for doing equality checks (e.g. mori), then you'll need to re-initialize DerivableJS with a custom equality function.

```javascript
import { withEquality } from 'derivable'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## 1.0.0 Roadmap

I think this is going to be 1.0.0 now.

## Contributing

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbitting).

## Thanks

Special thanks to:

- The [Futurice open source sponsorship program](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=derivablejs) for funding recent development.
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
